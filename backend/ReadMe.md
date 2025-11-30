## Installation & Setup

### 1. Clone the Repository
```sh
git clone https://github.com/dthatprince/flowrelay.git
cd flowrelay/backend
```

### 2. Create & Activate Virtual Environment
```sh
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate  # Windows
```

### 3. Install Dependencies
```sh
pip install -r requirements.txt

```


### 4. Run the Application
From the root directory (project):
```sh
python main.py

or 

uvicorn app.main:app --reload
```

The application will run at **`http://127.0.0.1:8000/`**


App API Docs **`http://127.0.0.1:8000/docs`**

---

