from fastapi import FastAPI
from database import Base, engine
from routes import auth, client, admin, driver
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Flow Relay API", version="1.0.2")

# CORS — allow_credentials=True is required for HttpOnly cookies to be sent/received.
# Note: allow_origins cannot be ["*"] when allow_credentials=True — list origins explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://flowrelay.onrender.com",
        "https://dthatprince.github.io",
        "https://dthatprince.github.io/",
        #"http://localhost:3000",
        #"http://localhost:8000",
        #"http://127.0.0.1:3000",
        #"http://127.0.0.1:8000",
    ],
    allow_credentials=True,   # Required for cookies to work cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers AFTER CORS middleware
app.include_router(auth.router)
app.include_router(client.router)
app.include_router(driver.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Welcome to Flow Relay API"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)