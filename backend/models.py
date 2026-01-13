from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_url = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    state = Column(String, default="Draft") 
    
    properties = relationship("Property", back_populates="document", cascade="all, delete-orphan")

class Property(Base):
    __tablename__ = "properties"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    key = Column(String)
    value = Column(String)
    
    document = relationship("Document", back_populates="properties")