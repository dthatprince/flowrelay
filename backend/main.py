from fastapi import FastAPI
from database import Base, engine
from routes import auth, client, admin, driver
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Flow Relay API", version="1.0.0")

# Include routers
app.include_router(auth.router)
app.include_router(client.router)
app.include_router(driver.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Welcome to Flow Relay API"}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://flowrelay.onrender.com", 
        "https://dthatprince.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)