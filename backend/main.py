import os
import shutil
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List
import models

# Database Setup (Auto-detects Render/Supabase or uses local SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./alneama_vault.db")
engine = create_engine(DATABASE_URL)
models.Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- Pydantic Schemas ---
class PropertySchema(BaseModel):
    key: str
    value: str

class WorkflowTransition(BaseModel):
    new_state: str

# --- API Endpoints ---

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Save File (In prod, upload to S3 here)
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{file.filename}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Create DB Object
    doc = models.Document(filename=file.filename, file_url=file_location)
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 3. Add Default Metadata
    default_props = [
        models.Property(document_id=doc.id, key="Class", value="Unclassified"),
        models.Property(document_id=doc.id, key="CreatedBy", value="Admin")
    ]
    db.add_all(default_props)
    db.commit()
    
    return doc

@app.get("/documents")
def get_documents(view: str = "All", db: Session = Depends(get_db)):
    # Virtual View Logic
    if view == "All":
        return db.query(models.Document).all()
    
    # Filter by "Class" (e.g., view="Invoice")
    return db.query(models.Document).join(models.Property).filter(
        models.Property.key == "Class",
        models.Property.value == view
    ).all()

@app.get("/documents/{doc_id}/properties")
def get_properties(doc_id: int, db: Session = Depends(get_db)):
    return db.query(models.Property).filter(models.Property.document_id == doc_id).all()

@app.post("/documents/{doc_id}/properties")
def update_property(doc_id: int, prop: PropertySchema, db: Session = Depends(get_db)):
    existing = db.query(models.Property).filter(
        models.Property.document_id == doc_id, models.Property.key == prop.key
    ).first()
    
    if existing:
        existing.value = prop.value
    else:
        new_prop = models.Property(document_id=doc_id, key=prop.key, value=prop.value)
        db.add(new_prop)
    
    db.commit()
    return {"status": "success"}

@app.post("/documents/{doc_id}/workflow")
def transition_workflow(doc_id: int, transition: WorkflowTransition, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Simple State Machine Logic
    valid_transitions = {
        "Draft": ["Review"],
        "Review": ["Approved", "Draft"],
        "Approved": ["Archived"]
    }
    
    if transition.new_state not in valid_transitions.get(doc.state, []):
         # Allow force change for demo, but normally raise error
         pass 

    doc.state = transition.new_state
    db.commit()
    return {"new_state": doc.state}