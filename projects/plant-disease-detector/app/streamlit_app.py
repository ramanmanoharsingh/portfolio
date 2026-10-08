import sys
from pathlib import Path

import numpy as np
import streamlit as st
import tensorflow as tf
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
sys.path.append(str(SRC_DIR))

from gradcam import make_gradcam_heatmap, overlay_heatmap
from predict import load_class_names, prepare_image, predict_image


MODEL_PATH = ROOT_DIR / "models" / "plant_disease_model.keras"
CLASS_NAMES_PATH = ROOT_DIR / "models" / "class_names.txt"

RECOMMENDATIONS = {
    "Healthy": "No visible disease detected. Continue regular monitoring and maintain proper watering and sunlight.",
    "Early_Blight": "Remove affected leaves, avoid overhead watering, improve air circulation, and consult local agricultural guidance for approved fungicide use.",
    "Late_Blight": "Isolate affected plants, remove infected parts carefully, avoid wet foliage, and seek local agricultural advice quickly.",
}


@st.cache_resource
def load_model():
    return tf.keras.models.load_model(MODEL_PATH)


@st.cache_data
def get_class_names():
    return load_class_names(CLASS_NAMES_PATH)


def main() -> None:
    st.set_page_config(page_title="Plant Disease Detector", page_icon="leaf", layout="centered")
    st.title("Plant Disease Detector")

    if not MODEL_PATH.exists() or not CLASS_NAMES_PATH.exists():
        st.error("Train the model first. Expected files in the models folder are missing.")
        st.code("python src/train.py --dataset dataset --epochs 10 --model-output models/plant_disease_model.keras")
        return

    model = load_model()
    class_names = get_class_names()

    uploaded_file = st.file_uploader("Upload a leaf image", type=["jpg", "jpeg", "png", "webp"])

    if uploaded_file is None:
        return

    image = Image.open(uploaded_file)
    st.image(image, caption="Uploaded image", use_container_width=True)

    predicted_class, confidence, predictions = predict_image(model, image, class_names)

    st.subheader("Prediction")
    st.metric(label="Disease class", value=predicted_class)
    st.metric(label="Confidence", value=f"{confidence:.2%}")

    st.subheader("Class Probabilities")
    probability_data = {
        class_name: float(probability)
        for class_name, probability in zip(class_names, predictions)
    }
    st.bar_chart(probability_data)

    st.subheader("Recommendation")
    st.write(RECOMMENDATIONS.get(predicted_class, "Consult a local agricultural expert for specific treatment guidance."))

    st.subheader("Explainability Heatmap")
    try:
        image_batch = prepare_image(image)
        predicted_index = int(np.argmax(predictions))
        heatmap = make_gradcam_heatmap(model, image_batch, predicted_index)
        heatmap_image = overlay_heatmap(image, heatmap)
        st.image(heatmap_image, caption="Grad-CAM heatmap", use_container_width=True)
    except Exception as exc:
        st.warning(f"Could not generate Grad-CAM heatmap: {exc}")

    st.info("This tool is an educational AI prototype. Confirm important crop disease decisions with a qualified agricultural expert.")


if __name__ == "__main__":
    main()
