from database import SessionLocal
from models import User, Profile
from auth import hash_password


TEST_USERS = [
    {
        "name": "Aarav Sharma",
        "email": "aarav@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Computer Engineering",
        "year": 4,
        "bio": "Backend developer interested in building scalable web applications.",
        "skills_offered": "Java,Spring Boot,AWS",
        "skills_wanted": "Python,UI/UX",
        "project_interests": "Web Development,AI",
        "availability": "Weekends",
    },
    {
        "name": "Riya Patel",
        "email": "riya@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Information Technology",
        "year": 3,
        "bio": "UI/UX enthusiast who enjoys designing simple and useful products.",
        "skills_offered": "UI/UX,Figma,HTML",
        "skills_wanted": "Python,Backend",
        "project_interests": "Web Development,Hackathons",
        "availability": "Flexible",
    },
    {
        "name": "Aditya Mehta",
        "email": "aditya@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Information Technology",
        "year": 4,
        "bio": "Full-stack developer interested in AI-powered applications.",
        "skills_offered": "React,Node.js,MongoDB",
        "skills_wanted": "Python,Machine Learning",
        "project_interests": "AI,Web Development",
        "availability": "Weekends",
    },
    {
        "name": "Neha Joshi",
        "email": "neha@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Information Technology",
        "year": 3,
        "bio": "Interested in machine learning and data-driven applications.",
        "skills_offered": "Python,Machine Learning,Pandas",
        "skills_wanted": "React,UI/UX",
        "project_interests": "AI,Data Science",
        "availability": "Weekends",
    },
    {
        "name": "Rahul Verma",
        "email": "rahul@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Computer Engineering",
        "year": 4,
        "bio": "Java developer exploring cloud technologies.",
        "skills_offered": "Java,SQL,Spring Boot",
        "skills_wanted": "React,AWS",
        "project_interests": "Web Development,Cloud",
        "availability": "Weekdays",
    },
    {
        "name": "Sneha Kulkarni",
        "email": "sneha@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Information Technology",
        "year": 4,
        "bio": "Cloud and DevOps enthusiast.",
        "skills_offered": "AWS,Docker,Kubernetes",
        "skills_wanted": "Python,SQL",
        "project_interests": "Cloud,DevOps",
        "availability": "Weekends",
    },
    {
        "name": "Kabir Shah",
        "email": "kabir@test.edu",
        "college": "SNDT Usha Mittal Institute of Technology",
        "branch": "Computer Engineering",
        "year": 3,
        "bio": "Competitive programming enthusiast who enjoys solving algorithmic problems.",
        "skills_offered": "C++,DSA,Java",
        "skills_wanted": "Web Development",
        "project_interests": "Competitive Programming",
        "availability": "Evenings",
    },
]


def seed_database():

    db = SessionLocal()

    try:

        for data in TEST_USERS:

            existing_user = (
                db.query(User)
                .filter(
                    User.email == data["email"]
                )
                .first()
            )

            if existing_user:
                print(
                    f"Skipping {data['email']} - already exists"
                )
                continue

            user = User(
                name=data["name"],
                email=data["email"],
                password_hash=hash_password(
                    "test123"
                ),
                college=data["college"],
                branch=data["branch"],
                year=data["year"],
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            profile = Profile(
                user_id=user.id,
                bio=data["bio"],
                skills_offered=data[
                    "skills_offered"
                ],
                skills_wanted=data[
                    "skills_wanted"
                ],
                project_interests=data[
                    "project_interests"
                ],
                availability=data[
                    "availability"
                ],
                avatar=data["name"][:2].upper(),
            )

            db.add(profile)
            db.commit()

            print(
                f"Created: {data['name']}"
            )

        print()
        print("TEST DATA CREATED SUCCESSFULLY")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()