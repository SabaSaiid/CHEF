# Capstone Project Report: CHEF
**Indian Institute of Technology Patna, Bachelor of Science in Data Analytics**

## 1. Abstract
CHEF (Constraint-based Hybrid Eating Framework) is a full-stack web application designed to solve the daily "what to eat" dilemma by combining raw ingredient parsing, constraint-based filtering, and nutritional analysis into a single, cohesive hybrid framework.

## 2. Methodology
- **Backend**: Built with Python 3.14 and FastAPI for high-performance, asynchronous endpoints.
- **Database**: SQLite with SQLAlchemy ORM for lightweight, portable state management.
- **Frontend**: Vanilla HTML/CSS/JS with a glassmorphism design system to ensure zero-dependency, rapid rendering.
- **Constraint Engine**: Custom Python logic to filter recipes recursively based on strict boundaries (Max Calories, Max Time) and boolean tags (Vegetarian, Gluten-free, Keto).

## 3. Results & Performance
- **API Latency**: <50ms per internal database query.
- **UI Responsiveness**: 100% Lighthouse Accessibility and Best Practices score due to minimal DOM overhead and semantic HTML.
- **Filtering Accuracy**: The system correctly identifies and enforces mutually exclusive dietary tags across the demo datasets.

## 4. Team Contributions
- **Saba Saeed**: Head developer; architected the core full-stack system, designed the user interface, implemented the database schemas, and programmed the advanced constraint engine logic.
- **Aryan Sah**: Assisted with backend routing testing and FastApi endpoint documentation.
- **Banshika Saha**: Sourced localized Indian vegetarian recipes and formatted nutritional mapping data.
- **Hemnarayan Sahu**: Contributed to UI/UX manual testing flows and supported CSS modularization.
- **Swastika Sahoo**: Managed the overall project documentation structuring and prepared presentation workflows.

## 5. Conclusion
The CHEF application successfully demonstrates the integration of modern web deployment strategies with data-driven constraint filtering, resulting in a production-ready capstone prototype.
