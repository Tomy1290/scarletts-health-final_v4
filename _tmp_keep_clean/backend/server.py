from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta
from enum import Enum
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Utility function to convert date to datetime for MongoDB compatibility
def date_to_datetime(d: date) -> datetime:
    """Convert date to datetime for MongoDB BSON compatibility"""
    return datetime(d.year, d.month, d.day)

def datetime_to_date(dt: datetime) -> date:
    """Convert datetime back to date"""
    return dt.date()

# Enums
class DrinkType(str, Enum):
    WASSER = "wasser"
    ABNEHMKAFFEE = "abnehmkaffee"
    INGWER_KNOBLAUCH_TEE = "ingwer_knoblauch_tee"
    WASSERKUR = "wasserkur"
    KAFFEE = "kaffee"

class PillTime(str, Enum):
    MORNING = "morning"
    EVENING = "evening"

class GoalType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED_WEIGHT = "fixed_weight"

class ChatCategory(str, Enum):
    REZEPTE = "rezepte"
    GESUNDHEITSTIPPS = "gesundheitstipps"
    MOTIVATION = "motivation"
    FITNESS = "fitness"
    ERNAEHRUNG = "ernaehrung"
    ALLGEMEIN = "allgemein"

# Models
class PillTracking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    morning_taken: bool = False
    evening_taken: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_mongo(self):
        """Convert to MongoDB-compatible format"""
        data = self.dict()
        data['date'] = date_to_datetime(self.date)
        return data
    
    @classmethod
    def from_mongo(cls, data):
        """Create from MongoDB data"""
        if data and 'date' in data:
            data['date'] = datetime_to_date(data['date'])
        return cls(**data)

class DrinkTracking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    drinks: Dict[DrinkType, int] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_mongo(self):
        """Convert to MongoDB-compatible format"""
        data = self.dict()
        data['date'] = date_to_datetime(self.date)
        return data
    
    @classmethod
    def from_mongo(cls, data):
        """Create from MongoDB data"""
        if data and 'date' in data:
            data['date'] = datetime_to_date(data['date'])
        return cls(**data)

class WeightEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    weight: float  # in kg with decimals
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_mongo(self):
        """Convert to MongoDB-compatible format"""
        data = self.dict()
        data['date'] = date_to_datetime(self.date)
        return data
    
    @classmethod
    def from_mongo(cls, data):
        """Create from MongoDB data"""
        if data and 'date' in data:
            data['date'] = datetime_to_date(data['date'])
        return cls(**data)

class WeightGoal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal_type: GoalType
    start_weight: float
    target_weight: Optional[float] = None
    target_percentage: Optional[float] = None
    start_date: date
    target_date: date
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_mongo(self):
        """Convert to MongoDB-compatible format"""
        data = self.dict()
        data['start_date'] = date_to_datetime(self.start_date)
        data['target_date'] = date_to_datetime(self.target_date)
        return data
    
    @classmethod
    def from_mongo(cls, data):
        """Create from MongoDB data"""
        if data:
            if 'start_date' in data:
                data['start_date'] = datetime_to_date(data['start_date'])
            if 'target_date' in data:
                data['target_date'] = datetime_to_date(data['target_date'])
        return cls(**data)

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reminder_type: str  # 'pills_morning', 'pills_evening', 'weight', 'drinks'
    time: str  # HH:MM format
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    is_user: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SavedChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_message: str
    ai_response: str
    category: ChatCategory
    title: str  # User-defined title for the saved message
    tags: List[str] = Field(default_factory=list)  # Optional tags for better organization
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    height: Optional[float] = None  # in cm
    age: Optional[int] = None
    gender: Optional[str] = None  # 'male', 'female', 'other'
    activity_level: Optional[str] = None  # 'low', 'medium', 'high'
    glass_size: int = 250  # Default: 250ml per glass
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WaterIntake(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    glasses_consumed: int = 0
    ml_per_glass: int = 250
    total_ml: int = 0
    daily_goal_ml: int = 2000  # Default 2L
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_mongo(self):
        """Convert to MongoDB-compatible format"""
        data = self.dict()
        data['date'] = date_to_datetime(self.date)
        return data
    
    @classmethod
    def from_mongo(cls, data):
        """Create from MongoDB data"""
        if data and 'date' in data:
            data['date'] = datetime_to_date(data['date'])
        return cls(**data)

class Achievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"  # For multi-user support later
    badge_type: str  # 'pills_streak', 'water_goal', 'weight_consistency', etc.
    title: str
    description: str
    icon: str
    color: str
    xp_reward: int
    requirement_count: int  # How many times needed
    current_count: int = 0
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserStats(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"
    total_xp: int = 0
    current_level: int = 1
    current_streak_days: int = 0
    longest_streak: int = 0
    pills_taken_total: int = 0
    water_goals_achieved: int = 0
    weight_entries_total: int = 0
    perfect_days: int = 0  # Days with all goals achieved
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"
    morning_pills_time: str = "08:00"
    evening_pills_time: str = "20:00"
    water_reminder_times: List[str] = Field(default_factory=lambda: ["10:00", "14:00", "18:00"])
    weight_reminder_time: str = "07:00"
    motivation_reminder_time: str = "19:00"
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AppSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"
    theme: str = "pink"  # 'pink', 'blue', 'green'
    language: str = "de"
    sound_enabled: bool = True
    vibration_enabled: bool = True
    analytics_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HealthInsight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"
    insight_type: str  # 'pattern', 'prediction', 'recommendation', 'warning'
    title: str
    description: str
    confidence: float  # 0.0 to 1.0
    category: str  # 'pills', 'water', 'weight', 'overall'
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HealthChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WeightProgress(BaseModel):
    date: date
    weight: float
    difference: Optional[float] = None  # Difference from previous day
    
# Create Models
class PillTrackingCreate(BaseModel):
    date: date
    morning_taken: Optional[bool] = False
    evening_taken: Optional[bool] = False

class PillUpdate(BaseModel):
    morning_taken: Optional[bool] = None
    evening_taken: Optional[bool] = None

class DrinkTrackingCreate(BaseModel):
    date: date
    drinks: Dict[DrinkType, int] = Field(default_factory=dict)

class DrinkUpdate(BaseModel):
    drink_type: DrinkType
    count: int

class WeightEntryCreate(BaseModel):
    date: date
    weight: float

class WeightGoalCreate(BaseModel):
    goal_type: GoalType
    start_weight: float
    target_weight: Optional[float] = None
    target_percentage: Optional[float] = None
    start_date: date
    target_date: date

class ReminderCreate(BaseModel):
    reminder_type: str
    time: str
    is_enabled: bool = True

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class SaveChatMessageRequest(BaseModel):
    original_message: str
    ai_response: str
    category: ChatCategory
    title: str
    tags: List[str] = Field(default_factory=list)

class UpdateSavedMessageRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[ChatCategory] = None
    tags: Optional[List[str]] = None

class UserProfileCreate(BaseModel):
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    glass_size: int = 250

class WaterIntakeUpdate(BaseModel):
    glasses_consumed: Optional[int] = None
    ml_per_glass: Optional[int] = None

class NotificationSettingsUpdate(BaseModel):
    morning_pills_time: Optional[str] = None
    evening_pills_time: Optional[str] = None
    water_reminder_times: Optional[List[str]] = None
    weight_reminder_time: Optional[str] = None
    motivation_reminder_time: Optional[str] = None
    is_enabled: Optional[bool] = None

class AppSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    sound_enabled: Optional[bool] = None
    vibration_enabled: Optional[bool] = None
    analytics_enabled: Optional[bool] = None

# Achievement System Utilities
def initialize_default_achievements():
    """Initialize default achievement badges - Expanded system up to Level 100"""
    return [
        # === BASIC ACHIEVEMENTS (Level 1-20) ===
        {
            "badge_type": "pills_streak_7",
            "title": "💊 Pillen-Profi",
            "description": "7 Tage alle Tabletten genommen",
            "icon": "medical",
            "color": "#4CAF50",
            "xp_reward": 100,
            "requirement_count": 7
        },
        {
            "badge_type": "water_streak_5",
            "title": "💧 Wasserdrache", 
            "description": "5 Tage Wasserziel erreicht",
            "icon": "water",
            "color": "#2196F3",
            "xp_reward": 75,
            "requirement_count": 5
        },
        {
            "badge_type": "weight_consistency_10",
            "title": "📈 Gewichts-Warrior",
            "description": "10 Gewichtseinträge in Folge",
            "icon": "trending-up",
            "color": "#9C27B0",
            "xp_reward": 150,
            "requirement_count": 10
        },
        {
            "badge_type": "coffee_control_7",
            "title": "☕ Kaffee-Kontrolle",
            "description": "Eine Woche unter 6 Kaffees/Tag",
            "icon": "cafe",
            "color": "#FF9800",
            "xp_reward": 80,
            "requirement_count": 7
        },
        {
            "badge_type": "first_week",
            "title": "🌟 Erste Schritte",
            "description": "7 Tage die App verwendet",
            "icon": "star",
            "color": "#FFD700",
            "xp_reward": 50,
            "requirement_count": 7
        },
        
        # === INTERMEDIATE ACHIEVEMENTS (Level 20-50) ===
        {
            "badge_type": "pills_streak_30",
            "title": "💊 Pillen-Meister",
            "description": "30 Tage alle Tabletten genommen",
            "icon": "medical",
            "color": "#4CAF50",
            "xp_reward": 300,
            "requirement_count": 30
        },
        {
            "badge_type": "water_streak_14",
            "title": "💧 Aqua-Champion",
            "description": "14 Tage Wasserziel erreicht",
            "icon": "water",
            "color": "#2196F3",
            "xp_reward": 200,
            "requirement_count": 14
        },
        {
            "badge_type": "perfect_week",
            "title": "🔥 Perfekte Woche",
            "description": "7 Tage alle Ziele erreicht",
            "icon": "flame",
            "color": "#FF5722",
            "xp_reward": 250,
            "requirement_count": 7
        },
        {
            "badge_type": "tea_lover_20",
            "title": "🫖 Tee-Liebhaber",
            "description": "20x Ingwer-Knoblauch-Tee getrunken",
            "icon": "leaf",
            "color": "#4CAF50",
            "xp_reward": 120,
            "requirement_count": 20
        },
        {
            "badge_type": "weight_loss_2kg",
            "title": "📉 Erste Erfolge",
            "description": "2kg erfolgreich abgenommen",
            "icon": "trending-down",
            "color": "#9C27B0",
            "xp_reward": 400,
            "requirement_count": 2
        },
        
        # === ADVANCED ACHIEVEMENTS (Level 50-75) ===
        {
            "badge_type": "pills_streak_100",
            "title": "💊 Pillen-Legende", 
            "description": "100 Tage alle Tabletten genommen",
            "icon": "medical",
            "color": "#4CAF50",
            "xp_reward": 1000,
            "requirement_count": 100
        },
        {
            "badge_type": "water_streak_30",
            "title": "💧 Hydrations-König",
            "description": "30 Tage Wasserziel erreicht",
            "icon": "water",
            "color": "#2196F3",
            "xp_reward": 500,
            "requirement_count": 30
        },
        {
            "badge_type": "perfect_month",
            "title": "🌙 Perfekter Monat",
            "description": "30 Tage alle Ziele erreicht",
            "icon": "moon",
            "color": "#9C27B0",
            "xp_reward": 750,
            "requirement_count": 30
        },
        {
            "badge_type": "water_cure_50",
            "title": "💦 Wasserkur-Experte",
            "description": "50x Wasserkur durchgeführt",
            "icon": "medical",
            "color": "#00BCD4",
            "xp_reward": 300,
            "requirement_count": 50
        },
        {
            "badge_type": "weight_loss_5kg",
            "title": "📉 Großer Erfolg",
            "description": "5kg erfolgreich abgenommen",
            "icon": "trending-down",
            "color": "#9C27B0",
            "xp_reward": 800,
            "requirement_count": 5
        },
        {
            "badge_type": "early_bird_30",
            "title": "🌅 Frühaufsteher",
            "description": "30x vor 8:00 Uhr Gewicht eingetragen",
            "icon": "sunny",
            "color": "#FFC107",
            "xp_reward": 200,
            "requirement_count": 30
        },
        
        # === EXPERT ACHIEVEMENTS (Level 75-90) ===
        {
            "badge_type": "streak_master_50",
            "title": "🔥 Streak-Master",
            "description": "50 Tage perfektes Tracking",
            "icon": "flame",
            "color": "#FF5722",
            "xp_reward": 1200,
            "requirement_count": 50
        },
        {
            "badge_type": "health_guru_90",
            "title": "⭐ Gesundheits-Guru",
            "description": "90 Tage alle Kategorien erfüllt",
            "icon": "star",
            "color": "#FFD700",
            "xp_reward": 1500,
            "requirement_count": 90
        },
        {
            "badge_type": "pills_streak_365",
            "title": "💊 Jahres-Champion",
            "description": "365 Tage alle Tabletten genommen",
            "icon": "medical",
            "color": "#4CAF50",
            "xp_reward": 2500,
            "requirement_count": 365
        },
        {
            "badge_type": "weight_loss_10kg",
            "title": "📉 Transformation",
            "description": "10kg erfolgreich abgenommen",
            "icon": "trending-down",
            "color": "#9C27B0",
            "xp_reward": 2000,
            "requirement_count": 10
        },
        
        # === LEGENDARY ACHIEVEMENTS (Level 90-100) ===
        {
            "badge_type": "perfect_100_days",
            "title": "💎 Diamant-Status",
            "description": "100 Tage perfektes Tracking",
            "icon": "diamond",
            "color": "#E1BEE7",
            "xp_reward": 3000,
            "requirement_count": 100
        },
        {
            "badge_type": "water_master_100",
            "title": "💧 Aqua-Legende",
            "description": "100 Tage Wasserziel erreicht",
            "icon": "water",
            "color": "#2196F3",
            "xp_reward": 2000,
            "requirement_count": 100
        },
        {
            "badge_type": "consistency_king",
            "title": "👑 Beständigkeits-König",
            "description": "200 Tage App-Nutzung",
            "icon": "crown",
            "color": "#FFD700",
            "xp_reward": 4000,
            "requirement_count": 200
        },
        {
            "badge_type": "weight_loss_20kg",
            "title": "🏆 Mega-Transformation",
            "description": "20kg erfolgreich abgenommen",
            "icon": "trophy",
            "color": "#FF6F00",
            "xp_reward": 5000,
            "requirement_count": 20
        },
        {
            "badge_type": "zen_master",
            "title": "🧘 Zen-Meister",
            "description": "365 Tage perfekte Balance",
            "icon": "flower",
            "color": "#9C27B0",
            "xp_reward": 10000,
            "requirement_count": 365
        },
        
        # === SPECIAL ACHIEVEMENTS ===
        {
            "badge_type": "night_owl",
            "title": "🦉 Nachteule",
            "description": "50x nach 22:00 Uhr getrackt",
            "icon": "moon",
            "color": "#3F51B5",
            "xp_reward": 150,
            "requirement_count": 50
        },
        {
            "badge_type": "weekend_warrior",
            "title": "🌅 Wochenend-Krieger",
            "description": "20 perfekte Wochenenden",
            "icon": "calendar",
            "color": "#795548",
            "xp_reward": 300,
            "requirement_count": 20
        },
        {
            "badge_type": "chat_enthusiast",
            "title": "💬 Chat-Enthusiast",
            "description": "100 Nachrichten mit Gugi",
            "icon": "chatbubbles",
            "color": "#FF69B4",
            "xp_reward": 200,
            "requirement_count": 100
        },
        {
            "badge_type": "knowledge_seeker",
            "title": "📚 Wissenssammler",
            "description": "50 Tipps gespeichert",
            "icon": "library",
            "color": "#607D8B",
            "xp_reward": 250,
            "requirement_count": 50
        }
    ]

def calculate_level_from_xp(xp: int) -> int:
    """Calculate user level based on XP (every 500 XP = 1 level)"""
    return max(1, (xp // 500) + 1)

def get_xp_for_next_level(current_xp: int) -> int:
    """Get XP needed for next level"""
    current_level = calculate_level_from_xp(current_xp)
    next_level_xp = current_level * 500
    return max(0, next_level_xp - current_xp)

async def update_user_stats_and_achievements(date_str: str, action_type: str, db_connection):
    """Update user stats and check for new achievements"""
    try:
        # Get current user stats
        user_stats = await db_connection.user_stats.find_one({"user_id": "default"})
        if not user_stats:
            # Initialize user stats
            stats = UserStats()
            await db_connection.user_stats.insert_one(stats.dict())
            user_stats = stats.dict()
        
        stats_obj = UserStats(**user_stats)
        xp_gained = 0
        
        # Award XP based on action
        if action_type == "pill_taken":
            xp_gained = 10
            stats_obj.pills_taken_total += 1
        elif action_type == "water_goal_reached":
            xp_gained = 20
            stats_obj.water_goals_achieved += 1
        elif action_type == "weight_entered":
            xp_gained = 15
            stats_obj.weight_entries_total += 1
        elif action_type == "perfect_day":
            xp_gained = 50
            stats_obj.perfect_days += 1
        
        stats_obj.total_xp += xp_gained
        stats_obj.current_level = calculate_level_from_xp(stats_obj.total_xp)
        stats_obj.updated_at = datetime.utcnow()
        
        # Update stats in database
        await db_connection.user_stats.update_one(
            {"user_id": "default"},
            {"$set": stats_obj.dict()},
            upsert=True
        )
        
        # Check for achievement unlocks
        await check_and_unlock_achievements(db_connection)
        
        return {"xp_gained": xp_gained, "total_xp": stats_obj.total_xp, "level": stats_obj.current_level}
        
    except Exception as e:
        print(f"Error updating user stats: {e}")
        return {"xp_gained": 0, "total_xp": 0, "level": 1}

async def check_and_unlock_achievements(db_connection):
    """Check if user has unlocked any new achievements"""
    try:
        # Initialize achievements if not exist
        existing_achievements = await db_connection.achievements.find({"user_id": "default"}).to_list(1000)
        
        if not existing_achievements:
            default_achievements = initialize_default_achievements()
            for ach in default_achievements:
                achievement = Achievement(user_id="default", **ach)
                await db_connection.achievements.insert_one(achievement.dict())
        
        # Check achievement progress
        achievements = await db_connection.achievements.find({"user_id": "default", "is_unlocked": False}).to_list(1000)
        
        for ach_data in achievements:
            ach = Achievement(**ach_data)
            should_unlock = False
            
            # Check different achievement types
            if ach.badge_type == "pills_streak_7":
                # Check if user has taken pills for 7 consecutive days
                pill_streak = await calculate_consecutive_pill_days(db_connection)
                if pill_streak >= 7:
                    should_unlock = True
                    
            elif ach.badge_type == "water_streak_5":
                # Check water goal achievement streak
                water_streak = await calculate_water_goal_streak(db_connection)
                if water_streak >= 5:
                    should_unlock = True
                    
            elif ach.badge_type == "weight_consistency_10":
                # Check consecutive weight entries
                weight_streak = await calculate_weight_entry_streak(db_connection)
                if weight_streak >= 10:
                    should_unlock = True
            
            if should_unlock:
                await db_connection.achievements.update_one(
                    {"id": ach.id},
                    {"$set": {
                        "is_unlocked": True,
                        "unlocked_at": datetime.utcnow(),
                        "current_count": ach.requirement_count
                    }}
                )
                
                # Award XP for achievement
                user_stats = await db_connection.user_stats.find_one({"user_id": "default"})
                if user_stats:
                    new_xp = user_stats["total_xp"] + ach.xp_reward
                    new_level = calculate_level_from_xp(new_xp)
                    await db_connection.user_stats.update_one(
                        {"user_id": "default"},
                        {"$set": {
                            "total_xp": new_xp,
                            "current_level": new_level,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                
    except Exception as e:
        print(f"Error checking achievements: {e}")

async def calculate_consecutive_pill_days(db_connection) -> int:
    """Calculate consecutive days of taking all pills"""
    try:
        # Get last 30 days of pill data
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        pills_data = await db_connection.pill_tracking.find({
            "date": {"$gte": date_to_datetime(start_date), "$lte": date_to_datetime(end_date)}
        }).sort("date", -1).to_list(30)
        
        consecutive_days = 0
        current_date = end_date
        
        for i in range(30):
            check_date = current_date - timedelta(days=i)
            pill_entry = next((p for p in pills_data if datetime_to_date(p["date"]) == check_date), None)
            
            if pill_entry and pill_entry.get("morning_taken", False) and pill_entry.get("evening_taken", False):
                consecutive_days += 1
            else:
                break
                
        return consecutive_days
        
    except Exception as e:
        print(f"Error calculating pill streak: {e}")
        return 0

async def calculate_water_goal_streak(db_connection) -> int:
    """Calculate consecutive days of reaching water goals"""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        water_data = await db_connection.water_intake.find({
            "date": {"$gte": date_to_datetime(start_date), "$lte": date_to_datetime(end_date)}
        }).sort("date", -1).to_list(30)
        
        consecutive_days = 0
        current_date = end_date
        
        for i in range(30):
            check_date = current_date - timedelta(days=i)
            water_entry = next((w for w in water_data if datetime_to_date(w["date"]) == check_date), None)
            
            if water_entry and water_entry.get("total_ml", 0) >= water_entry.get("daily_goal_ml", 2000):
                consecutive_days += 1
            else:
                break
                
        return consecutive_days
        
    except Exception as e:
        print(f"Error calculating water streak: {e}")
        return 0

async def calculate_weight_entry_streak(db_connection) -> int:
    """Calculate consecutive days of weight entries"""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        weight_data = await db_connection.weight_entries.find({
            "date": {"$gte": date_to_datetime(start_date), "$lte": date_to_datetime(end_date)}
        }).sort("date", -1).to_list(30)
        
        consecutive_days = 0
        current_date = end_date
        
        for i in range(30):
            check_date = current_date - timedelta(days=i)
            weight_entry = next((w for w in weight_data if datetime_to_date(w["date"]) == check_date), None)
            
            if weight_entry:
                consecutive_days += 1
            else:
                break
                
        return consecutive_days
        
    except Exception as e:
        print(f"Error calculating weight streak: {e}")
        return 0

# Utility function to calculate daily water needs
def calculate_daily_water_need(weight_kg: float, height_cm: Optional[float] = None, 
                             age: Optional[int] = None, activity_level: str = 'medium') -> int:
    """Calculate daily water needs in ml based on weight, height, age, and activity level"""
    # Base calculation: 35ml per kg of body weight
    base_ml = weight_kg * 35
    
    # Activity level adjustments
    activity_multipliers = {
        'low': 1.0,
        'medium': 1.2,
        'high': 1.5
    }
    
    activity_ml = base_ml * activity_multipliers.get(activity_level, 1.2)
    
    # Age adjustments (older people need slightly less)
    if age and age > 65:
        activity_ml *= 0.9
    elif age and age < 25:
        activity_ml *= 1.1
    
    # Minimum 1.5L, maximum 4L for safety
    return min(max(int(activity_ml), 1500), 4000)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Scarletts Gesundheitstracking API"}

# Health AI Chat Routes
@api_router.post("/health-chat")
async def health_chat(request: ChatRequest):
    try:
        # Initialize LLM Chat with health-focused system message
        system_message = """Du bist Gugi, ein freundlicher und kompetenter KI-Gesundheitsassistent. 
        Du hilfst bei:
        - Gesundheitstipps und Wellness-Ratschlägen
        - Gesunden Rezepten und Ernährungsberatung
        - Motivation für Gewichtsziele
        - Allgemeine Gesundheitsfragen
        - Fitness und Bewegungsempfehlungen
        
        Antworte immer auf Deutsch, sei warmherzig und ermutigend. Gib keine medizinischen Diagnosen, 
        sondern ermutige bei ernsten Gesundheitsproblemen, einen Arzt aufzusuchen."""
        
        session_id = request.session_id or str(uuid.uuid4())
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Get AI response
        ai_response = await chat.send_message(user_message)
        
        # Save chat to database
        user_chat_msg = ChatMessage(message=request.message, is_user=True)
        ai_chat_msg = ChatMessage(message=ai_response, is_user=False)
        
        # Check if session exists
        existing_session = await db.chat_sessions.find_one({"session_id": session_id})
        if existing_session:
            # Add messages to existing session
            await db.chat_sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {"messages": {"$each": [user_chat_msg.dict(), ai_chat_msg.dict()]}},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        else:
            # Create new session
            new_session = HealthChatSession(
                session_id=session_id,
                messages=[user_chat_msg, ai_chat_msg]
            )
            await db.chat_sessions.insert_one(new_session.dict())
        
        return {
            "response": ai_response,
            "session_id": session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@api_router.get("/health-chat/{session_id}")
async def get_chat_history(session_id: str):
    try:
        session = await db.chat_sessions.find_one({"session_id": session_id})
        if session:
            return HealthChatSession(**session)
        return {"messages": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Saved Chat Messages Routes
@api_router.post("/saved-messages", response_model=SavedChatMessage)
async def save_chat_message(request: SaveChatMessageRequest):
    """Save a chat message with category and title for later reference"""
    try:
        saved_message = SavedChatMessage(**request.dict())
        await db.saved_chat_messages.insert_one(saved_message.dict())
        return saved_message
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving message: {str(e)}")

@api_router.get("/saved-messages", response_model=List[SavedChatMessage])
async def get_saved_messages(category: Optional[ChatCategory] = None, tag: Optional[str] = None):
    """Get saved chat messages, optionally filtered by category or tag"""
    try:
        query = {}
        if category:
            query["category"] = category.value
        if tag:
            query["tags"] = {"$in": [tag]}
            
        messages = await db.saved_chat_messages.find(query).sort("created_at", -1).to_list(1000)
        return [SavedChatMessage(**msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/saved-messages/{message_id}", response_model=SavedChatMessage)
async def get_saved_message(message_id: str):
    """Get a specific saved message by ID"""
    try:
        message = await db.saved_chat_messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        return SavedChatMessage(**message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/saved-messages/{message_id}", response_model=SavedChatMessage)
async def update_saved_message(message_id: str, request: UpdateSavedMessageRequest):
    """Update a saved message's title, category, or tags"""
    try:
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.category is not None:
            update_data["category"] = request.category.value
        if request.tags is not None:
            update_data["tags"] = request.tags
            
        update_data["updated_at"] = datetime.utcnow()
        
        await db.saved_chat_messages.update_one(
            {"id": message_id},
            {"$set": update_data}
        )
        
        updated_message = await db.saved_chat_messages.find_one({"id": message_id})
        if not updated_message:
            raise HTTPException(status_code=404, detail="Message not found")
            
        return SavedChatMessage(**updated_message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/saved-messages/{message_id}")
async def delete_saved_message(message_id: str):
    """Delete a saved message"""
    try:
        result = await db.saved_chat_messages.delete_one({"id": message_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        return {"message": "Saved message deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/saved-messages/categories/all")
async def get_categories_with_counts():
    """Get all categories with their message counts"""
    try:
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await db.saved_chat_messages.aggregate(pipeline).to_list(1000)
        
        categories = {}
        for item in result:
            categories[item["_id"]] = item["count"]
            
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Weight Progress with Differences Route
@api_router.get("/weight-progress/{days}")
async def get_weight_progress(days: int):
    """Get weight progress for the last X days with differences"""
    try:
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
            
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # Get weight entries for the date range
        weight_entries = await db.weight_entries.find({
            "date": {"$gte": date_to_datetime(start_date), "$lte": date_to_datetime(end_date)}
        }).sort("date", 1).to_list(days)
        
        if not weight_entries:
            return {"progress": [], "summary": {"total_days": days, "entries_found": 0}}
        
        # Convert to WeightEntry objects and calculate differences
        progress = []
        previous_weight = None
        
        for entry in weight_entries:
            weight_entry = WeightEntry.from_mongo(entry)
            
            # Calculate difference from previous day
            difference = None
            if previous_weight is not None:
                difference = round(weight_entry.weight - previous_weight, 1)
            
            progress_entry = WeightProgress(
                date=weight_entry.date,
                weight=weight_entry.weight,
                difference=difference
            )
            progress.append(progress_entry)
            previous_weight = weight_entry.weight
        
        # Calculate summary statistics
        if len(progress) > 1:
            total_change = round(progress[-1].weight - progress[0].weight, 1)
            average_daily_change = round(total_change / (len(progress) - 1), 2)
        else:
            total_change = 0.0
            average_daily_change = 0.0
            
        summary = {
            "total_days": days,
            "entries_found": len(progress),
            "total_change": total_change,
            "start_weight": progress[0].weight if progress else None,
            "current_weight": progress[-1].weight if progress else None,
            "average_daily_change": average_daily_change
        }
        
        return {
            "progress": [p.dict() for p in progress],
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Pill Tracking Routes
@api_router.get("/pills/{date_str}", response_model=Optional[PillTracking])
async def get_pill_tracking(date_str: str):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        pill_data = await db.pill_tracking.find_one({"date": date_to_datetime(tracking_date)})
        if pill_data:
            return PillTracking.from_mongo(pill_data)
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/pills", response_model=PillTracking)
async def create_pill_tracking(input: PillTrackingCreate):
    existing = await db.pill_tracking.find_one({"date": date_to_datetime(input.date)})
    if existing:
        raise HTTPException(status_code=400, detail="Tracking for this date already exists")
    
    pill_obj = PillTracking(**input.dict())
    await db.pill_tracking.insert_one(pill_obj.to_mongo())
    return pill_obj

@api_router.put("/pills/{date_str}", response_model=PillTracking)
async def update_pill_tracking(date_str: str, input: PillUpdate):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        existing = await db.pill_tracking.find_one({"date": date_to_datetime(tracking_date)})
        
        if not existing:
            # Create new if doesn't exist
            pill_data = {"date": tracking_date, "morning_taken": False, "evening_taken": False}
            pill_obj = PillTracking(**pill_data)
        else:
            pill_obj = PillTracking.from_mongo(existing)
        
        # Update fields
        update_data = {}
        if input.morning_taken is not None:
            update_data["morning_taken"] = input.morning_taken
        if input.evening_taken is not None:
            update_data["evening_taken"] = input.evening_taken
        
        update_data["updated_at"] = datetime.utcnow()
        
        if existing:
            await db.pill_tracking.update_one(
                {"date": date_to_datetime(tracking_date)},
                {"$set": update_data}
            )
        else:
            pill_obj = PillTracking(**{**pill_obj.dict(), **update_data})
            await db.pill_tracking.insert_one(pill_obj.to_mongo())
        
        # Return updated object
        updated = await db.pill_tracking.find_one({"date": date_to_datetime(tracking_date)})
        return PillTracking.from_mongo(updated)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Drink Tracking Routes
@api_router.get("/drinks/{date_str}", response_model=Optional[DrinkTracking])
async def get_drink_tracking(date_str: str):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        drink_data = await db.drink_tracking.find_one({"date": date_to_datetime(tracking_date)})
        if drink_data:
            return DrinkTracking.from_mongo(drink_data)
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/drinks/{date_str}", response_model=DrinkTracking)
async def update_drink_tracking(date_str: str, input: DrinkUpdate):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        existing = await db.drink_tracking.find_one({"date": date_to_datetime(tracking_date)})
        
        if not existing:
            # Create new
            drinks_dict = {drink_type: 0 for drink_type in DrinkType}
            drinks_dict[input.drink_type] = input.count
            drink_obj = DrinkTracking(date=tracking_date, drinks=drinks_dict)
            await db.drink_tracking.insert_one(drink_obj.to_mongo())
            return drink_obj
        else:
            # Update existing
            existing_drinks = existing.get("drinks", {})
            existing_drinks[input.drink_type.value] = input.count
            
            await db.drink_tracking.update_one(
                {"date": date_to_datetime(tracking_date)},
                {"$set": {"drinks": existing_drinks, "updated_at": datetime.utcnow()}}
            )
            
            updated = await db.drink_tracking.find_one({"date": date_to_datetime(tracking_date)})
            return DrinkTracking.from_mongo(updated)
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Weight Tracking Routes
@api_router.get("/weight/{date_str}", response_model=Optional[WeightEntry])
async def get_weight_entry(date_str: str):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        weight_data = await db.weight_entries.find_one({"date": date_to_datetime(tracking_date)})
        if weight_data:
            return WeightEntry.from_mongo(weight_data)
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/weight", response_model=WeightEntry)
async def create_weight_entry(input: WeightEntryCreate):
    existing = await db.weight_entries.find_one({"date": date_to_datetime(input.date)})
    if existing:
        # Update existing
        await db.weight_entries.update_one(
            {"date": date_to_datetime(input.date)},
            {"$set": {"weight": input.weight, "updated_at": datetime.utcnow()}}
        )
        updated = await db.weight_entries.find_one({"date": date_to_datetime(input.date)})
        return WeightEntry.from_mongo(updated)
    else:
        weight_obj = WeightEntry(**input.dict())
        await db.weight_entries.insert_one(weight_obj.to_mongo())
        return weight_obj

@api_router.get("/weight/range/{start_date}/{end_date}", response_model=List[WeightEntry])
async def get_weight_range(start_date: str, end_date: str):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        weight_entries = await db.weight_entries.find({
            "date": {"$gte": date_to_datetime(start), "$lte": date_to_datetime(end)}
        }).sort("date", 1).to_list(1000)
        
        return [WeightEntry.from_mongo(entry) for entry in weight_entries]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Weight Goals Routes
@api_router.get("/weight-goals", response_model=List[WeightGoal])
async def get_weight_goals():
    goals = await db.weight_goals.find().sort("created_at", -1).to_list(1000)
    return [WeightGoal.from_mongo(goal) for goal in goals]

@api_router.post("/weight-goals", response_model=WeightGoal)
async def create_weight_goal(input: WeightGoalCreate):
    # Deactivate previous goals
    await db.weight_goals.update_many({}, {"$set": {"is_active": False}})
    
    goal_obj = WeightGoal(**input.dict())
    await db.weight_goals.insert_one(goal_obj.to_mongo())
    return goal_obj

@api_router.get("/weight-goals/active", response_model=Optional[WeightGoal])
async def get_active_weight_goal():
    goal = await db.weight_goals.find_one({"is_active": True})
    if goal:
        return WeightGoal.from_mongo(goal)
    return None

@api_router.get("/weight-goals/daily-target/{current_weight}")
async def get_daily_target(current_weight: float):
    """Calculate daily weight target based on active goal"""
    active_goal = await db.weight_goals.find_one({"is_active": True})
    if not active_goal:
        return {"error": "No active goal found"}
    
    goal = WeightGoal.from_mongo(active_goal)
    
    # Calculate target weight
    if goal.goal_type == GoalType.PERCENTAGE:
        target_weight = goal.start_weight * (1 - (goal.target_percentage / 100))
    else:
        target_weight = goal.target_weight
    
    # Calculate days remaining
    today = date.today()
    days_remaining = (goal.target_date - today).days
    
    if days_remaining <= 0:
        return {"error": "Goal target date has passed"}
    
    # Calculate daily target
    weight_to_lose = current_weight - target_weight
    daily_target = weight_to_lose / days_remaining
    
    return {
        "target_weight": target_weight,
        "weight_to_lose": weight_to_lose,
        "days_remaining": days_remaining,
        "daily_target": daily_target,
        "suggested_daily_weight": current_weight - daily_target
    }

# Reminders Routes
@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders():
    reminders = await db.reminders.find().to_list(1000)
    return [Reminder(**reminder) for reminder in reminders]

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(input: ReminderCreate):
    reminder_obj = Reminder(**input.dict())
    await db.reminders.insert_one(reminder_obj.dict())
    return reminder_obj

@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, input: ReminderCreate):
    await db.reminders.update_one(
        {"id": reminder_id},
        {"$set": {**input.dict(), "updated_at": datetime.utcnow()}}
    )
    
    updated = await db.reminders.find_one({"id": reminder_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return Reminder(**updated)

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    result = await db.reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}

# Dashboard Summary Route
@api_router.get("/dashboard/{date_str}")
async def get_dashboard_summary(date_str: str):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Get all data for the date
        pills = await db.pill_tracking.find_one({"date": date_to_datetime(tracking_date)})
        drinks = await db.drink_tracking.find_one({"date": date_to_datetime(tracking_date)})
        weight = await db.weight_entries.find_one({"date": date_to_datetime(tracking_date)})
        active_goal = await db.weight_goals.find_one({"is_active": True})
        water_intake = await db.water_intake.find_one({"date": date_to_datetime(tracking_date)})
        user_profile = await db.user_profile.find_one({})
        
        return {
            "date": tracking_date,
            "pills": PillTracking.from_mongo(pills) if pills else None,
            "drinks": DrinkTracking.from_mongo(drinks) if drinks else None,
            "weight": WeightEntry.from_mongo(weight) if weight else None,
            "active_goal": WeightGoal.from_mongo(active_goal) if active_goal else None,
            "water_intake": WaterIntake.from_mongo(water_intake) if water_intake else None,
            "user_profile": UserProfile(**user_profile) if user_profile else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# User Profile Routes
@api_router.get("/user-profile", response_model=Optional[UserProfile])
async def get_user_profile():
    try:
        profile = await db.user_profile.find_one({})
        if profile:
            return UserProfile(**profile)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/user-profile", response_model=UserProfile)
async def create_or_update_user_profile(profile_data: UserProfileCreate):
    try:
        existing = await db.user_profile.find_one({})
        
        if existing:
            # Update existing profile
            update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            
            await db.user_profile.update_one(
                {"id": existing["id"]},
                {"$set": update_data}
            )
            
            updated = await db.user_profile.find_one({"id": existing["id"]})
            return UserProfile(**updated)
        else:
            # Create new profile
            profile = UserProfile(**profile_data.dict())
            await db.user_profile.insert_one(profile.dict())
            return profile
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Water Intake Routes
@api_router.get("/water-intake/{date_str}", response_model=Optional[WaterIntake])
async def get_water_intake(date_str: str):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        water_data = await db.water_intake.find_one({"date": date_to_datetime(tracking_date)})
        if water_data:
            return WaterIntake.from_mongo(water_data)
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/water-intake/{date_str}", response_model=WaterIntake)
async def update_water_intake(date_str: str, update_data: WaterIntakeUpdate):
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Get user profile for glass size and weight-based calculations
        user_profile = await db.user_profile.find_one({})
        glass_size = user_profile.get("glass_size", 250) if user_profile else 250
        
        # Get current weight for daily goal calculation
        latest_weight_entry = await db.weight_entries.find_one(
            {"date": {"$lte": date_to_datetime(tracking_date)}},
            sort=[("date", -1)]
        )
        
        current_weight = latest_weight_entry.get("weight", 70) if latest_weight_entry else 70
        
        # Calculate daily goal based on weight and profile
        daily_goal_ml = calculate_daily_water_need(
            weight_kg=current_weight,
            height_cm=user_profile.get("height") if user_profile else None,
            age=user_profile.get("age") if user_profile else None,
            activity_level=user_profile.get("activity_level", "medium") if user_profile else "medium"
        )
        
        existing = await db.water_intake.find_one({"date": date_to_datetime(tracking_date)})
        
        if existing:
            # Update existing
            new_glasses = update_data.glasses_consumed if update_data.glasses_consumed is not None else existing.get("glasses_consumed", 0)
            new_ml_per_glass = update_data.ml_per_glass if update_data.ml_per_glass is not None else existing.get("ml_per_glass", glass_size)
            
            update_fields = {
                "glasses_consumed": new_glasses,
                "ml_per_glass": new_ml_per_glass,
                "total_ml": new_glasses * new_ml_per_glass,
                "daily_goal_ml": daily_goal_ml,
                "updated_at": datetime.utcnow()
            }
            
            await db.water_intake.update_one(
                {"date": date_to_datetime(tracking_date)},
                {"$set": update_fields}
            )
            
            updated = await db.water_intake.find_one({"date": date_to_datetime(tracking_date)})
            return WaterIntake.from_mongo(updated)
        else:
            # Create new
            new_glasses = update_data.glasses_consumed if update_data.glasses_consumed is not None else 0
            new_ml_per_glass = update_data.ml_per_glass if update_data.ml_per_glass is not None else glass_size
            
            water_intake = WaterIntake(
                date=tracking_date,
                glasses_consumed=new_glasses,
                ml_per_glass=new_ml_per_glass,
                total_ml=new_glasses * new_ml_per_glass,
                daily_goal_ml=daily_goal_ml
            )
            
            await db.water_intake.insert_one(water_intake.to_mongo())
            return water_intake
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/water-intake/{date_str}/status")
async def get_water_intake_status(date_str: str):
    """Get detailed water intake status including progress and recommendations"""
    try:
        tracking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        water_intake = await db.water_intake.find_one({"date": date_to_datetime(tracking_date)})
        
        if not water_intake:
            # Get user profile for calculations
            user_profile = await db.user_profile.find_one({})
            glass_size = user_profile.get("glass_size", 250) if user_profile else 250
            
            # Get current weight for daily goal calculation
            latest_weight_entry = await db.weight_entries.find_one(
                {"date": {"$lte": date_to_datetime(tracking_date)}},
                sort=[("date", -1)]
            )
            
            current_weight = latest_weight_entry.get("weight", 70) if latest_weight_entry else 70
            
            daily_goal_ml = calculate_daily_water_need(
                weight_kg=current_weight,
                height_cm=user_profile.get("height") if user_profile else None,
                age=user_profile.get("age") if user_profile else None,
                activity_level=user_profile.get("activity_level", "medium") if user_profile else "medium"
            )
            
            return {
                "total_ml": 0,
                "daily_goal_ml": daily_goal_ml,
                "remaining_ml": daily_goal_ml,
                "progress_percentage": 0,
                "glasses_consumed": 0,
                "ml_per_glass": glass_size,
                "glasses_needed": daily_goal_ml // glass_size
            }
        
        water_data = WaterIntake.from_mongo(water_intake)
        remaining_ml = max(0, water_data.daily_goal_ml - water_data.total_ml)
        progress_percentage = min(100, (water_data.total_ml / water_data.daily_goal_ml) * 100)
        glasses_needed = max(0, remaining_ml // water_data.ml_per_glass)
        
        return {
            "total_ml": water_data.total_ml,
            "daily_goal_ml": water_data.daily_goal_ml,
            "remaining_ml": remaining_ml,
            "progress_percentage": round(progress_percentage, 1),
            "glasses_consumed": water_data.glasses_consumed,
            "ml_per_glass": water_data.ml_per_glass,
            "glasses_needed": glasses_needed
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Achievement Routes
@api_router.get("/achievements")
async def get_achievements():
    """Get all achievements with unlock status"""
    try:
        achievements = await db.achievements.find({"user_id": "default"}).to_list(1000)
        if not achievements:
            # Initialize default achievements
            await check_and_unlock_achievements(db)
            achievements = await db.achievements.find({"user_id": "default"}).to_list(1000)
        
        return [Achievement(**ach) for ach in achievements]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/user-stats") 
async def get_user_stats():
    """Get user statistics and progress"""
    try:
        user_stats = await db.user_stats.find_one({"user_id": "default"})
        if not user_stats:
            stats = UserStats()
            await db.user_stats.insert_one(stats.dict())
            return stats
        
        return UserStats(**user_stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings Routes
@api_router.get("/settings/notifications")
async def get_notification_settings():
    """Get notification settings"""
    try:
        settings = await db.notification_settings.find_one({"user_id": "default"})
        if not settings:
            default_settings = NotificationSettings()
            await db.notification_settings.insert_one(default_settings.dict())
            return default_settings
        
        return NotificationSettings(**settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/settings/notifications")
async def update_notification_settings(settings: NotificationSettingsUpdate):
    """Update notification settings"""
    try:
        existing = await db.notification_settings.find_one({"user_id": "default"})
        
        if existing:
            update_data = {k: v for k, v in settings.dict().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            
            await db.notification_settings.update_one(
                {"user_id": "default"},
                {"$set": update_data}
            )
        else:
            new_settings = NotificationSettings(**settings.dict())
            await db.notification_settings.insert_one(new_settings.dict())
        
        updated = await db.notification_settings.find_one({"user_id": "default"})
        return NotificationSettings(**updated)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/settings/app")
async def get_app_settings():
    """Get app settings"""
    try:
        settings = await db.app_settings.find_one({"user_id": "default"})
        if not settings:
            default_settings = AppSettings()
            await db.app_settings.insert_one(default_settings.dict())
            return default_settings
        
        return AppSettings(**settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/settings/app")
async def update_app_settings(settings: AppSettingsUpdate):
    """Update app settings"""
    try:
        existing = await db.app_settings.find_one({"user_id": "default"})
        
        if existing:
            update_data = {k: v for k, v in settings.dict().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            
            await db.app_settings.update_one(
                {"user_id": "default"},
                {"$set": update_data}
            )
        else:
            new_settings = AppSettings(**settings.dict())
            await db.app_settings.insert_one(new_settings.dict())
        
        updated = await db.app_settings.find_one({"user_id": "default"})
        return AppSettings(**updated)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()