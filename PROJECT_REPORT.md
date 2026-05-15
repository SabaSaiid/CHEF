# Capstone Project Report: CHEF
*Your ingredients. Our intelligence.*

**Indian Institute of Technology Patna, UG Program in CS & Data Analytics**

## Abstract
CHEF (Constraint-based Hybrid Eating Framework) is a full-stack web application developed as a Capstone-I project at IIT Patna to solve the daily 'what to eat' dilemma. Rather than just searching by dish name, users provide the ingredients they have on hand, and the system searches a database of over 7,000 recipes to recommend meals that utilize those ingredients while strictly adhering to the user's specific dietary preferences, available cooking time, and calorie limits.

To make ingredient entry as seamless as possible, the project implements two distinct approaches: a custom text parser for natural language quantities and a lightweight YOLOv8 machine learning model for detecting food items from images. Once identified, recipes are filtered against personalized daily calorie goals calculated via a built-in TDEE (Total Daily Energy Expenditure) engine. By the end of the semester, the entire system—combining a FastAPI backend, a modern React frontend, and a local SQLite database—was successfully integrated into a complete, end-to-end nutritional assistant.

## 1. Introduction
In the contemporary digital era, the global nutritional landscape is shifting toward a crisis of convenience. Despite India's rich culinary heritage, the nation currently faces **major public health challenges, including rising obesity, diabetes, cardiovascular disease, and malnutrition**. This decline is largely driven by an **increasing consumption of highly processed foods, sugary beverages, and low-nutrient fast food**, which has significantly contributed to a declining quality of life, especially among younger populations. While India’s healthcare system continues to improve, **preventive health through smarter dietary choices remains critical** to reversing these trends.

**CHEF (Constraint-based Hybrid Eating Framework)** was developed as a Capstone-I project at the Indian Institute of Technology Patna to combat this nutritional decline. Our framework encourages a modern culinary shift—urging users to explore diverse, high-quality **continental and global cuisines** without sacrificing their health or cultural preferences. The core objective of CHEF is to bridge the gap between ingredient availability and strict nutritional compliance, helping users navigate decision fatigue and dietary restrictions (such as keto, vegan, or gluten-free) through an intelligent, personalized assistant.

Unlike traditional platforms, CHEF uses a hybrid approach combining natural language processing for ingredient parsing and **YOLOv8 machine learning** for image-based food detection. By syncing a database of over 7,000 recipes with a personalized **TDEE (Total Daily Energy Expenditure)** engine, the system ensures that healthy eating is as accessible as ordering fast food. Looking ahead, we envision CHEF evolving into a specialized health tool—potentially **analyzing clinical prescriptions** to automatically suggest therapeutic diets for patients with chronic conditions. By bridging the gap between a doctor's advice and a user's kitchen, CHEF aims to revolutionize the intersection of technology, medicine, and modern gastronomy.

## 2. Methodology
- **Backend**: Built with Python 3.14 and FastAPI for high-performance, asynchronous endpoints.
- **Database**: SQLite with SQLAlchemy ORM for lightweight, portable state management.
- **Frontend**: React 19 + Vite 8 with a glassmorphism design system to ensure dynamic, responsive rendering.
- **Constraint Engine**: Custom Python logic to filter recipes recursively based on strict boundaries (Max Calories, Max Time) and boolean tags (Vegetarian, Gluten-free, Keto).

## 3. Results & Performance
- **API Latency**: <50ms per internal database query.
- **UI Responsiveness**: 100% Lighthouse Accessibility and Best Practices score with efficient React component rendering and semantic HTML.
- **Filtering Accuracy**: The system correctly identifies and enforces mutually exclusive dietary tags across the demo datasets.

## 4. Contribution Summary
- **Saba Saeed**: Designed the Project architecture and UI/UX, managing documentations, and assisted with constraint engine and database scripting.
- **Aryan Sah**: Developed the add-on of YouTube videos in the project recipes dataset and images, FastAPI parameters, backend routing testing, and branch management.
- **Banshika Saha**: Development of recipe search engine, Spoonacular API integration, diet filtering, Vite Dev server proxy, and populated the recipe dataset.
- **Hemnarayan Sahu**: Integrated JWT authentication and assisted with JS UI/UX frontend, CSS developments, and design constraints.
- **Swastika Sahoo**: Development of TDEE Engine, Nutrition Logic, SQLite database schemas, and Computer Vision Food Detection (YOLOv8) backend.

## 5. Future Scope & Social Relevance
The current implementation of **CHEF** serves as a foundational platform for preventive healthcare through intelligent nutrition. However, the roadmap for future development extends into specialized medical and social domains:

*   **Clinical Integration**: A primary goal for the next iteration is the development of a **Prescription Analysis Module**. By utilizing Optical Character Recognition (OCR) and NLP, the system will be able to analyze a doctor’s clinical prescriptions and automatically adjust the filtering logic to recommend therapeutic diets (e.g., low-sodium diets for hypertension or low-glycemic meals for diabetic patients).
*   **Expansion of Global Cuisines**: While the project already supports over 7,000 recipes, we aim to further diversify the database with a focus on **Healthy Continental Gastronomy**. This will provide users with a broader palette of nutritious global flavors, helping to break the monotony of traditional diets while maintaining strict health standards.
*   **Public Health Impact**: By targeting the rising consumption of ultra-processed foods among younger populations, CHEF aims to serve as a **preventive health tool**. Our vision is to collaborate with healthcare providers to offer a digital companion that bridges the gap between medical advice and daily kitchen habits, ultimately contributing to a rise in India’s overall health index.
*   **Advanced ML Detection**: Future versions will move beyond the current YOLOv8-based detection of 10 food classes to a broader model capable of identifying complex mixed-ingredient dishes and estimating portion sizes for even more precise caloric tracking.

## 6. Conclusion
The CHEF application successfully demonstrates the integration of modern web deployment strategies with data-driven constraint filtering, resulting in a production-ready capstone prototype.
