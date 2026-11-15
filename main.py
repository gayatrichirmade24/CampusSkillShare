from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import Base, engine, get_db
from models import Match, Message, Profile, Swipe, User
from schemas import (
    LoginRequest,
    MessageCreate,
    ProfileUpdate,
    SignupRequest,
    SwipeRequest,
)


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Campus SkillShare API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def serialize_profile(profile: Profile):
    return {
        "bio": profile.bio or "",
        "skillsOffered": (
            profile.skills_offered.split(",")
            if profile.skills_offered
            else []
        ),
        "skillsWanted": (
            profile.skills_wanted.split(",")
            if profile.skills_wanted
            else []
        ),
        "projectInterests": (
            profile.project_interests.split(",")
            if profile.project_interests
            else []
        ),
        "availability": profile.availability or "Flexible",
        "avatar": profile.avatar or "YU",
    }


def user_to_dict(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "college": user.college,
        "branch": user.branch,
        "year": user.year,
        "profile": (
            serialize_profile(user.profile)
            if user.profile
            else None
        ),
    }


def get_authorized_match(
    match_id: int,
    current_user: User,
    db: Session,
):
    match = (
        db.query(Match)
        .filter(Match.id == match_id)
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found.",
        )

    if current_user.id not in (
        match.user1_id,
        match.user2_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not part of this match.",
        )

    return match


def calculate_match_score(
    current_user: User,
    candidate: User,
):
    if (
        not current_user.profile
        or not candidate.profile
    ):
        return 0

    current_offered = {
        skill.strip().lower()
        for skill in (
            current_user.profile.skills_offered
            or ""
        ).split(",")
        if skill.strip()
    }

    current_wanted = {
        skill.strip().lower()
        for skill in (
            current_user.profile.skills_wanted
            or ""
        ).split(",")
        if skill.strip()
    }

    candidate_offered = {
        skill.strip().lower()
        for skill in (
            candidate.profile.skills_offered
            or ""
        ).split(",")
        if skill.strip()
    }

    candidate_wanted = {
        skill.strip().lower()
        for skill in (
            candidate.profile.skills_wanted
            or ""
        ).split(",")
        if skill.strip()
    }

    score = 0

    # Candidate has skills current user wants
    score += (
        len(
            current_wanted.intersection(
                candidate_offered
            )
        )
        * 30
    )

    # Current user has skills candidate wants
    score += (
        len(
            candidate_wanted.intersection(
                current_offered
            )
        )
        * 30
    )

    # Same availability
    if (
        current_user.profile.availability
        == candidate.profile.availability
    ):
        score += 10

    # Common project interests
    current_projects = {
        item.strip().lower()
        for item in (
            current_user.profile.project_interests
            or ""
        ).split(",")
        if item.strip()
    }

    candidate_projects = {
        item.strip().lower()
        for item in (
            candidate.profile.project_interests
            or ""
        ).split(",")
        if item.strip()
    }

    score += (
        len(
            current_projects.intersection(
                candidate_projects
            )
        )
        * 10
    )

    return score


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database": "mysql",
    }


# =========================================================
# AUTH - SIGNUP
# =========================================================

@app.post("/api/auth/signup")
def signup(
    data: SignupRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered.",
        )

    # MVP college email validation
    if not data.email.lower().endswith(".edu"):
        raise HTTPException(
            status_code=400,
            detail="Please use a valid college email address.",
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        college=data.college,
        branch=data.branch,
        year=data.year,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(
        user_id=user.id,
        bio="",
        skills_offered="",
        skills_wanted="",
        project_interests="",
        availability="Flexible",
        avatar=(
            data.name[:2].upper()
            if len(data.name) >= 2
            else "YU"
        ),
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    token = create_access_token(user.id)

    return {
        "message": "Signup successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


# =========================================================
# AUTH - LOGIN
# =========================================================

@app.post("/api/auth/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    token = create_access_token(user.id)

    return {
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/api/users/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    return user_to_dict(current_user)


# =========================================================
# UPDATE PROFILE
# =========================================================

@app.put("/api/users/me/profile")
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.profile

    if not profile:
        profile = Profile(
            user_id=current_user.id
        )
        db.add(profile)

    profile.bio = data.bio

    profile.skills_offered = ",".join(
        skill.strip()
        for skill in data.skillsOffered
        if skill.strip()
    )

    profile.skills_wanted = ",".join(
        skill.strip()
        for skill in data.skillsWanted
        if skill.strip()
    )

    profile.project_interests = ",".join(
        project.strip()
        for project in data.projectInterests
        if project.strip()
    )

    profile.availability = (
        data.availability or "Flexible"
    )

    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile updated successfully.",
        "profile": serialize_profile(profile),
    }


# =========================================================
# DISCOVER PROFILES
# =========================================================

@app.get("/api/profiles")
def get_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidates = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            User.college == current_user.college,
        )
        .all()
    )

    results = []

    for candidate in candidates:

        previous_swipe = (
            db.query(Swipe)
            .filter(
                Swipe.from_user_id
                == current_user.id,
                Swipe.to_user_id
                == candidate.id,
            )
            .first()
        )

        if previous_swipe:
            continue

        score = calculate_match_score(
            current_user,
            candidate,
        )

        results.append(
            {
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "college": candidate.college,
                "branch": candidate.branch,
                "year": candidate.year,
                "profile": serialize_profile(
                    candidate.profile
                ),
                "matchScore": score,
            }
        )

    results.sort(
        key=lambda item: item["matchScore"],
        reverse=True,
    )

    return results


# =========================================================
# GET USER
# =========================================================

@app.get("/api/users/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user_to_dict(user)


# =========================================================
# SWIPE / CONNECT
# =========================================================

@app.post("/api/swipes")
def swipe(
    data: SwipeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.toUserId == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot swipe on yourself.",
        )

    target_user = (
        db.query(User)
        .filter(User.id == data.toUserId)
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    existing_swipe = (
        db.query(Swipe)
        .filter(
            Swipe.from_user_id
            == current_user.id,
            Swipe.to_user_id
            == data.toUserId,
        )
        .first()
    )

    if existing_swipe:
        existing_swipe.liked = data.liked

    else:
        existing_swipe = Swipe(
            from_user_id=current_user.id,
            to_user_id=data.toUserId,
            liked=data.liked,
        )

        db.add(existing_swipe)

    db.commit()

    if not data.liked:
        return {
            "message": "Passed.",
            "matched": False,
        }

    # Check if the other user also connected
    mutual_swipe = (
        db.query(Swipe)
        .filter(
            Swipe.from_user_id
            == data.toUserId,
            Swipe.to_user_id
            == current_user.id,
            Swipe.liked == True,
        )
        .first()
    )

    if not mutual_swipe:
        return {
            "message": "Connection request sent.",
            "matched": False,
        }

    # Keep match pair in consistent order
    user1_id = min(
        current_user.id,
        data.toUserId,
    )

    user2_id = max(
        current_user.id,
        data.toUserId,
    )

    existing_match = (
        db.query(Match)
        .filter(
            Match.user1_id == user1_id,
            Match.user2_id == user2_id,
        )
        .first()
    )

    if not existing_match:

        existing_match = Match(
            user1_id=user1_id,
            user2_id=user2_id,
        )

        db.add(existing_match)
        db.commit()
        db.refresh(existing_match)

    return {
        "message": "It's a match!",
        "matched": True,
        "matchId": existing_match.id,
        "user": user_to_dict(target_user),
    }


# =========================================================
# MATCHES
# =========================================================

@app.get("/api/matches")
def get_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matches = (
        db.query(Match)
        .filter(
            (Match.user1_id == current_user.id)
            | (Match.user2_id == current_user.id)
        )
        .order_by(
            Match.created_at.desc()
        )
        .all()
    )

    results = []

    for match in matches:

        other_user_id = (
            match.user2_id
            if match.user1_id == current_user.id
            else match.user1_id
        )

        other_user = (
            db.query(User)
            .filter(
                User.id == other_user_id
            )
            .first()
        )

        if not other_user:
            continue

        results.append(
            {
                "matchId": match.id,
                "user": user_to_dict(
                    other_user
                ),
                "createdAt": match.created_at,
            }
        )

    return results


# =========================================================
# CHAT - GET MESSAGES
# =========================================================

@app.get(
    "/api/chats/{match_id}/messages"
)
def get_messages(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = get_authorized_match(
        match_id,
        current_user,
        db,
    )

    messages = (
        db.query(Message)
        .filter(
            Message.match_id == match.id
        )
        .order_by(
            Message.created_at.asc()
        )
        .all()
    )

    return [
        {
            "id": message.id,
            "matchId": message.match_id,
            "senderId": message.sender_id,
            "message": message.message,
            "isRead": message.is_read,
            "createdAt": message.created_at,
        }
        for message in messages
    ]


# =========================================================
# CHAT - SEND MESSAGE
# =========================================================

@app.post(
    "/api/chats/{match_id}/messages"
)
def send_message(
    match_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = get_authorized_match(
        match_id,
        current_user,
        db,
    )

    message_text = data.message.strip()

    if not message_text:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    new_message = Message(
        match_id=match.id,
        sender_id=current_user.id,
        message=message_text,
        is_read=False,
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    return {
        "id": new_message.id,
        "matchId": new_message.match_id,
        "senderId": new_message.sender_id,
        "message": new_message.message,
        "isRead": new_message.is_read,
        "createdAt": new_message.created_at,
    }


# =========================================================
# STATIC FRONTEND
# =========================================================
#
# IMPORTANT:
# There is intentionally NO @app.get("/")
# route above this section.
#
# This allows FastAPI to serve:
# public/index.html
# when the browser opens:
# http://127.0.0.1:8000/
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"

if not PUBLIC_DIR.exists():
    print(
        f"WARNING: public folder not found: {PUBLIC_DIR}"
    )
else:
    app.mount(
        "/",
        StaticFiles(
            directory=PUBLIC_DIR,
            html=True,
        ),
        name="public",
    )

# ---------------------------------------------------------
# CHAT - MARK MESSAGES AS READ
# ---------------------------------------------------------

@app.patch("/api/chats/{match_id}/read")
def mark_messages_as_read(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = get_authorized_match(
        match_id,
        current_user,
        db,
    )

    messages = (
        db.query(Message)
        .filter(
            Message.match_id == match.id,
            Message.sender_id != current_user.id,
            Message.is_read == False,
        )
        .all()
    )

    for message in messages:
        message.is_read = True

    db.commit()

    return {
        "message": "Messages marked as read.",
        "updated": len(messages),
    }