from fastapi import FastAPI
from database import Base, engine
from routes import auth, client, admin
from fastapi.middleware.cors import CORSMiddleware


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Transport Delivery API", version="1.0.0")

# Include routers
app.include_router(auth.router)
app.include_router(client.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Welcome to Transport Delivery API"}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://flowrelay.onrender.com"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)