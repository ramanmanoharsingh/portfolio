# Plant Disease Detection From Images

This project trains a deep learning model to classify plant leaf disease images, then serves the model in a Streamlit web app with confidence scores, treatment suggestions, and optional Grad-CAM explainability.

## 1. Project Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If TensorFlow installation is slow or fails, install it separately:

```powershell
pip install tensorflow
```

## 2. Dataset Structure

Put your raw dataset into this format:

```text
dataset_raw/
  Healthy/
    image1.jpg
    image2.jpg
  Early_Blight/
    image1.jpg
    image2.jpg
  Late_Blight/
    image1.jpg
    image2.jpg
```

Then split it:

```powershell
python src/split_dataset.py --input dataset_raw --output dataset --train 0.7 --val 0.15 --test 0.15
```

After splitting, the dataset will look like:

```text
dataset/
  train/
    Healthy/
    Early_Blight/
    Late_Blight/
  val/
    Healthy/
    Early_Blight/
    Late_Blight/
  test/
    Healthy/
    Early_Blight/
    Late_Blight/
```

## 3. Train The Model

Train MobileNetV2 using transfer learning:

```powershell
python src/train.py --dataset dataset --epochs 10 --model-output models/plant_disease_model.keras
```

The script saves:

```text
models/plant_disease_model.keras
models/class_names.txt
models/training_history.png
models/confusion_matrix.png
```

## 4. Test One Image

```powershell
python src/predict.py --model models/plant_disease_model.keras --classes models/class_names.txt --image path/to/leaf.jpg
```

## 5. Run The Web App

```powershell
streamlit run app/streamlit_app.py
```

## 6. Recommended Dataset

For the first version, use 3 classes only:

```text
Healthy
Early_Blight
Late_Blight
```

After this works, expand to more crops and disease categories.

## 7. CV Bullet

Developed an AI-powered plant disease detection web application using MobileNetV2 transfer learning, TensorFlow, Grad-CAM explainability, and Streamlit deployment to classify leaf diseases from uploaded images with confidence scores and treatment recommendations.

