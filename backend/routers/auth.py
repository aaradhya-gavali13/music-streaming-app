from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: schemas.UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Check if username exists
    result = await db.execute(select(models.User).where(models.User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="This username is already taken.")

    # Create new user
    new_user = models.User(
        email=user_in.email,
        username=user_in.username,
        display_name=user_in.display_name or user_in.username,
        hashed_password=hash_password(user_in.password),
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "username": new_user.username})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserRead.from_orm(new_user)
    )

@router.post("/login", response_model=schemas.TokenResponse)
async def login(credentials: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    # Lookup by email or username
    query = select(models.User).where(
        (models.User.email == credentials.email) | (models.User.username == credentials.email)
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated.")

    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserRead.from_orm(user)
    )

@router.get("/me", response_model=schemas.UserRead)
async def get_me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserRead.from_orm(current_user)

@router.post("/logout")
async def logout():
    return {"message": "Successfully logged out. Please remove the access token from your client storage."}
