# Plant Disease Detector

A deep learning app that classifies plant leaf diseases from a photo. It reports a confidence score, suggests next steps and shows a Grad-CAM heatmap of the image regions that drove the prediction.

## Features

- MobileNetV2 transfer learning for image classification
- Confidence score and treatment recommendation for each prediction
- Grad-CAM explainability overlay
- Streamlit web app and a command-line predictor

## Tech

Python, TensorFlow / Keras, Streamlit, OpenCV, scikit-learn, matplotlib, seaborn

## Project structure

```text
src/
  split_dataset.py   split raw images into train / val / test
  train.py           train and evaluate the model
  predict.py         predict one image from the command line
  gradcam.py         Grad-CAM heatmap helpers
app/streamlit_app.py web interface
requirements.txt
```

## Setup

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If TensorFlow fails to install with the rest, install it on its own with `pip install tensorflow`.

## Prepare the dataset

Arrange your raw images in one folder per class:

```text
dataset_raw/
  Healthy/
  Early_Blight/
  Late_Blight/
```

Then split them:

```bash
python src/split_dataset.py --input dataset_raw --output dataset --train 0.7 --val 0.15 --test 0.15
```

Three classes (Healthy, Early Blight, Late Blight) make a good first version. Expand to more crops and diseases once that works. Datasets and trained models are not stored in this repository.

## Train

```bash
python src/train.py --dataset dataset --epochs 10 --model-output models/plant_disease_model.keras
```

Training saves the model, `class_names.txt`, a training-history plot and a confusion matrix in `models/`.

## Predict one image

```bash
python src/predict.py --model models/plant_disease_model.keras --classes models/class_names.txt --image path/to/leaf.jpg
```

## Run the web app

```bash
streamlit run app/streamlit_app.py
```
