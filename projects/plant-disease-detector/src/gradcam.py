import cv2
import numpy as np
import tensorflow as tf
from PIL import Image


IMAGE_SIZE = (224, 224)


def find_last_feature_layer(model: tf.keras.Model) -> tf.keras.layers.Layer:
    for layer in reversed(model.layers):
        if len(getattr(layer, "output_shape", [])) == 4:
            return layer

    raise ValueError("Could not find a 4D feature layer for Grad-CAM.")


def make_gradcam_heatmap(model: tf.keras.Model, image_batch: np.ndarray, class_index: int | None = None) -> np.ndarray:
    feature_layer = find_last_feature_layer(model)

    grad_model = tf.keras.Model(
        inputs=model.inputs,
        outputs=[feature_layer.output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image_batch)
        if class_index is None:
            class_index = tf.argmax(predictions[0])
        class_score = predictions[:, class_index]

    gradients = tape.gradient(class_score, conv_outputs)
    pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]

    heatmap = conv_outputs @ pooled_gradients[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)

    return heatmap.numpy()


def overlay_heatmap(image: Image.Image, heatmap: np.ndarray, alpha: float = 0.4) -> Image.Image:
    image = image.convert("RGB").resize(IMAGE_SIZE)
    image_array = np.array(image)

    heatmap = cv2.resize(heatmap, IMAGE_SIZE)
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    overlay = cv2.addWeighted(image_array, 1 - alpha, heatmap, alpha, 0)
    return Image.fromarray(overlay)
