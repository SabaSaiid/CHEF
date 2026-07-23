import io
import json
import re
from typing import Optional
from xml.sax.saxutils import escape
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import SavedRecipe, User

router = APIRouter(prefix="/api/recipes/saved", tags=["recipes"])
security_optional = HTTPBearer(auto_error=False)


def _get_current_user_export(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    token: Optional[str] = Query(None, description="JWT Token for direct browser export link"),
    db: Session = Depends(get_db),
) -> User:
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required. Please log in.",
        )

    try:
        payload = jwt.decode(
            raw_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def _get_user_recipe(recipe_id: int, db: Session, user: User) -> SavedRecipe:
    """Fetch a saved recipe owned by the current user, or raise 404."""
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == user.id,
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found in your saved collection")
    return recipe


def _recipe_to_text(recipe: SavedRecipe) -> str:
    """Format a saved recipe as clean plain text."""
    lines = []
    lines.append("=" * 60)
    lines.append(f"  {recipe.title}")
    lines.append("=" * 60)
    lines.append("")

    # Nutrition summary
    nutrition_parts = []
    if recipe.calories:
        nutrition_parts.append(f"Calories: {recipe.calories} kcal")
    if recipe.protein_g:
        nutrition_parts.append(f"Protein: {recipe.protein_g}g")
    if recipe.carbs_g:
        nutrition_parts.append(f"Carbs: {recipe.carbs_g}g")
    if recipe.fat_g:
        nutrition_parts.append(f"Fat: {recipe.fat_g}g")
    if nutrition_parts:
        lines.append("NUTRITION")
        lines.append("-" * 40)
        for part in nutrition_parts:
            lines.append(f"  {part}")
        lines.append("")

    # Meta
    meta_parts = []
    if recipe.ready_in_minutes:
        meta_parts.append(f"Cook Time: {recipe.ready_in_minutes} minutes")
    if recipe.servings:
        meta_parts.append(f"Servings: {recipe.servings}")
    if recipe.rating:
        meta_parts.append(f"Rating: {'★' * recipe.rating}{'☆' * (5 - recipe.rating)}")
    if meta_parts:
        for part in meta_parts:
            lines.append(f"  {part}")
        lines.append("")

    # Summary
    if recipe.summary:
        clean_summary = re.sub(r'<[^>]+>', '', recipe.summary)
        lines.append("DESCRIPTION")
        lines.append("-" * 40)
        lines.append(f"  {clean_summary}")
        lines.append("")

    # Ingredients
    if recipe.ingredients:
        lines.append("INGREDIENTS")
        lines.append("-" * 40)
        try:
            ing_list = json.loads(recipe.ingredients)
        except (json.JSONDecodeError, TypeError):
            ing_list = [i.strip() for i in recipe.ingredients.split(",") if i.strip()]
        for ing in ing_list:
            if isinstance(ing, dict):
                ing_str = f"{ing.get('amount', '')} {ing.get('unit', '')} {ing.get('name', '')}".strip()
            else:
                ing_str = str(ing).strip()
            if ing_str:
                lines.append(f"  • {ing_str}")
        lines.append("")

    # Instructions
    if recipe.instructions:
        clean_inst = re.sub(r'<[^>]+>', '', recipe.instructions)
        lines.append("INSTRUCTIONS")
        lines.append("-" * 40)
        lines.append(clean_inst)
        lines.append("")

    lines.append("-" * 60)
    lines.append("Exported from CHEF — Constraint-based Hybrid Eating Framework")
    lines.append("IIT Patna · Capstone-I")
    lines.append("")

    return "\n".join(lines)


def _recipe_to_pdf_bytes(recipe: SavedRecipe) -> bytes:
    """Generate a branded PDF for a saved recipe using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )

    # ── Colours ──
    accent = HexColor("#e07a5f")
    dark = HexColor("#3a261c")
    muted = HexColor("#6b4c3b")

    # ── Styles ──
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ChefTitle", parent=styles["Heading1"],
        fontSize=22, leading=28, textColor=accent,
        spaceAfter=6, alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "ChefSubtitle", parent=styles["Normal"],
        fontSize=10, textColor=muted,
        alignment=TA_CENTER, spaceAfter=16,
    )
    heading_style = ParagraphStyle(
        "ChefHeading", parent=styles["Heading2"],
        fontSize=14, leading=18, textColor=accent,
        spaceBefore=14, spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "ChefBody", parent=styles["Normal"],
        fontSize=11, leading=16, textColor=dark, spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "ChefBullet", parent=body_style,
        leftIndent=16, bulletIndent=6,
    )
    footer_style = ParagraphStyle(
        "ChefFooter", parent=styles["Normal"],
        fontSize=8, textColor=muted, alignment=TA_CENTER,
        spaceBefore=20,
    )

    story = []

    # Title
    safe_title = escape(recipe.title or "Recipe")
    story.append(Paragraph(safe_title, title_style))
    story.append(Paragraph("CHEF — Constraint-based Hybrid Eating Framework", subtitle_style))

    # Nutrition table
    nutrition_data = []
    if recipe.calories:
        nutrition_data.append(("Calories", f"{recipe.calories} kcal"))
    if recipe.protein_g:
        nutrition_data.append(("Protein", f"{recipe.protein_g}g"))
    if recipe.carbs_g:
        nutrition_data.append(("Carbs", f"{recipe.carbs_g}g"))
    if recipe.fat_g:
        nutrition_data.append(("Fat", f"{recipe.fat_g}g"))
    if recipe.ready_in_minutes:
        nutrition_data.append(("Cook Time", f"{recipe.ready_in_minutes} min"))
    if recipe.servings:
        nutrition_data.append(("Servings", str(recipe.servings)))

    if nutrition_data:
        table = Table(nutrition_data, colWidths=[80, 100])
        table.setStyle(TableStyle([
            ("TEXTCOLOR", (0, 0), (0, -1), accent),
            ("TEXTCOLOR", (1, 0), (1, -1), dark),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ]))
        story.append(table)
        story.append(Spacer(1, 8))

    # Summary
    if recipe.summary:
        story.append(Paragraph("Description", heading_style))
        clean_summary = re.sub(r'<[^>]+>', '', recipe.summary)
        story.append(Paragraph(escape(clean_summary), body_style))

    # Ingredients
    if recipe.ingredients:
        story.append(Paragraph("Ingredients", heading_style))
        try:
            ing_list = json.loads(recipe.ingredients)
        except (json.JSONDecodeError, TypeError):
            ing_list = [i.strip() for i in recipe.ingredients.split(",") if i.strip()]
        for ing in ing_list:
            if isinstance(ing, dict):
                ing_str = f"{ing.get('amount', '')} {ing.get('unit', '')} {ing.get('name', '')}".strip()
            else:
                ing_str = str(ing).strip()
            if ing_str:
                story.append(Paragraph(f"• {escape(ing_str)}", bullet_style))

    # Instructions
    if recipe.instructions:
        story.append(Paragraph("Instructions", heading_style))
        clean_inst = re.sub(r'<[^>]+>', '', recipe.instructions)
        for line in clean_inst.split("\n"):
            line = line.strip()
            if line:
                story.append(Paragraph(escape(line), body_style))

    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "Exported from CHEF · IIT Patna · Capstone-I",
        footer_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


@router.get(
    "/{recipe_id}/export",
    summary="Export a saved recipe as text or PDF",
    responses={
        200: {"description": "Recipe exported successfully"},
        404: {"description": "Recipe not found in user's collection"},
    },
)
def export_recipe(
    recipe_id: int,
    format: str = Query("text", pattern="^(text|pdf)$", description="Export format: text or pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user_export),
):
    """
    Export a saved recipe as a downloadable file.

    **Formats:**
    - `text` — clean plain text (default)
    - `pdf` — branded PDF with CHEF styling
    """
    recipe = _get_user_recipe(recipe_id, db, current_user)

    # Sanitize title for filename
    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in recipe.title)[:50].strip()
    safe_title = safe_title.replace(" ", "_") or "recipe"

    if format == "pdf":
        pdf_bytes = _recipe_to_pdf_bytes(recipe)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )

    # Default: plain text
    text_content = _recipe_to_text(recipe)
    return StreamingResponse(
        io.BytesIO(text_content.encode("utf-8")),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.txt"'},
    )

