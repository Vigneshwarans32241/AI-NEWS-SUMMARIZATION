from sqlalchemy import create_engine, Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
import os

load_dotenv()

# Check for a PostgreSQL/External Database URL in the environment
DATABASE_URL = os.getenv("DATABASE_URL")

# If an external URL exists, use it. Otherwise fallback to the local SQLite db.
if DATABASE_URL:
    # SQLAlchemy 1.4+ requires "postgresql://" instead of "postgres://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Supabase uses connection pooling, which requires some specific engine arguments to prevent disconnects
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True, 
        pool_size=10, 
        max_overflow=20
    )
else:
    # Local SQLite Fallback
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ArticleOriginal(Base):
    __tablename__ = "articles_original"

    id = Column(Integer, primary_key=True, index=True)
    source_url = Column(String, unique=True, index=True)
    publisher_name = Column(String, default="Unknown Publisher")
    headline = Column(String)
    raw_text = Column(Text)
    published_date = Column(String)
    
    simplified = relationship("ArticleSimplified", back_populates="original", uselist=False)

class ArticleSimplified(Base):
    __tablename__ = "articles_simplified"

    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, ForeignKey("articles_original.id"))
    simplified_headline = Column(String)
    simplified_text = Column(Text)
    readability_score = Column(Float)
    word_count = Column(Integer)
    processing_status = Column(String) # PASS, FAIL
    genre = Column(String, default="General")

    original = relationship("ArticleOriginal", back_populates="simplified")
    fact_verification = relationship("FactVerificationLog", back_populates="simplified", uselist=False)
    quizzes = relationship("Quiz", back_populates="simplified")

class FactVerificationLog(Base):
    __tablename__ = "fact_verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    simplified_id = Column(Integer, ForeignKey("articles_simplified.id"))
    confidence_pct = Column(Float)
    matched_entities_count = Column(Integer)
    failure_reason = Column(String, nullable=True)

    simplified = relationship("ArticleSimplified", back_populates="fact_verification")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    simplified_id = Column(Integer, ForeignKey("articles_simplified.id"))
    question_text = Column(String)
    question_type = Column(String) # main_idea, fact, inference

    simplified = relationship("ArticleSimplified", back_populates="quizzes")
    answers = relationship("QuizAnswer", back_populates="quiz")

class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    answer_text = Column(String)
    is_correct = Column(Boolean, default=False)
    
    quiz = relationship("Quiz", back_populates="answers")

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles_simplified.id"))
    quiz_score_pct = Column(Float)
    time_on_page_seconds = Column(Integer)
    viewed_original = Column(Boolean, default=False)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
