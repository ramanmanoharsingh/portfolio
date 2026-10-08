import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image


IMAGE_SIZE = (224, 224)


def load_class_names(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def prepare_image(image: Image.Image) -> np.ndarray:
    image = image.convert("RGB")
    image = image.resize(IMAGE_SIZE)
    image_array = np.array(image, dtype=np.float32)
    return np.expand_dims(image_array, axis=0)


def predict_image(model: tf.keras.Model, image: Image.Image, class_names: list[str]) -> tuple[str, float, np.ndarray]:
    image_batch = prepare_image(image)
    predictions = model.predict(image_batch, verbose=0)[0]
    predicted_index = int(np.argmax(predictions))
    predicted_class = class_names[predicted_index]
    confidence = float(predictions[predicted_index])
    return predicted_class, confidence, predictions


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict plant disease from one image.")
    parser.add_argument("--model", required=True)
    parser.add_argument("--classes", required=True)
    parser.add_argument("--image", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    model = tf.keras.models.load_model(args.model)
    class_names = load_class_names(Path(args.classes))
    image = Image.open(args.image)

    predicted_class, confidence, predictions = predict_image(model, image, class_names)

    print(f"Prediction: {predicted_class}")
    print(f"Confidence: {confidence:.2%}")
    print("\nAll class probabilities:")
    for class_name, probability in zip(class_names, predictions):
        print(f"{class_name}: {float(probability):.2%}")


if __name__ == "__main__":
    main()
