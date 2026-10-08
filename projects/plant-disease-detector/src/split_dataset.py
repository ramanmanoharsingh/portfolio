import argparse
import random
import shutil
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def list_images(folder: Path) -> list[Path]:
    return [
        path
        for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def copy_split(files: list[Path], class_name: str, output_dir: Path, split_name: str) -> None:
    target_dir = output_dir / split_name / class_name
    target_dir.mkdir(parents=True, exist_ok=True)

    for file_path in files:
        shutil.copy2(file_path, target_dir / file_path.name)


def split_dataset(input_dir: Path, output_dir: Path, train_ratio: float, val_ratio: float, test_ratio: float) -> None:
    total = train_ratio + val_ratio + test_ratio
    if abs(total - 1.0) > 0.001:
        raise ValueError("Train, validation, and test ratios must add up to 1.0")

    class_dirs = [path for path in input_dir.iterdir() if path.is_dir()]
    if not class_dirs:
        raise ValueError(f"No class folders found in {input_dir}")

    for class_dir in class_dirs:
        class_name = class_dir.name
        files = list_images(class_dir)
        random.shuffle(files)

        train_end = int(len(files) * train_ratio)
        val_end = train_end + int(len(files) * val_ratio)

        train_files = files[:train_end]
        val_files = files[train_end:val_end]
        test_files = files[val_end:]

        copy_split(train_files, class_name, output_dir, "train")
        copy_split(val_files, class_name, output_dir, "val")
        copy_split(test_files, class_name, output_dir, "test")

        print(
            f"{class_name}: "
            f"train={len(train_files)}, val={len(val_files)}, test={len(test_files)}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split image dataset into train/val/test folders.")
    parser.add_argument("--input", required=True, help="Raw dataset folder with one subfolder per class.")
    parser.add_argument("--output", required=True, help="Output dataset folder.")
    parser.add_argument("--train", type=float, default=0.7)
    parser.add_argument("--val", type=float, default=0.15)
    parser.add_argument("--test", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    split_dataset(
        input_dir=Path(args.input),
        output_dir=Path(args.output),
        train_ratio=args.train,
        val_ratio=args.val,
        test_ratio=args.test,
    )


if __name__ == "__main__":
    main()
