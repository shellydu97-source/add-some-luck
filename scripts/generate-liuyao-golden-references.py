import argparse
import json
import sys
import types
from datetime import datetime, timezone, timedelta
from pathlib import Path

CASES = [
    {"id": "pure-qian", "values": [7, 7, 7, 7, 7, 7]},
    {"id": "pure-dui", "values": [7, 7, 8, 7, 7, 8]},
    {"id": "pure-li", "values": [7, 8, 7, 7, 8, 7]},
    {"id": "pure-zhen", "values": [7, 8, 8, 7, 8, 8]},
    {"id": "pure-xun", "values": [8, 7, 7, 8, 7, 7]},
    {"id": "pure-kan", "values": [8, 7, 8, 8, 7, 8]},
    {"id": "pure-gen", "values": [8, 8, 7, 8, 8, 7]},
    {"id": "pure-kun", "values": [8, 8, 8, 8, 8, 8]},
    {"id": "qian-all-moving", "values": [9, 9, 9, 9, 9, 9]},
    {"id": "kun-all-moving", "values": [6, 6, 6, 6, 6, 6]},
    {"id": "mixed-moving-a", "values": [6, 7, 8, 9, 6, 7]},
    {"id": "mixed-moving-b", "values": [9, 8, 7, 6, 9, 8]},
]

def extract_iching(data):
    return {
        "name": data["卦"],
        "palace": data["世應卦"],
        "stems": data["天干"],
        "branches": data["地支"],
        "elements": data["五行"],
        "shiYing": data["世應爻"],
        "relations": data["六親用神"],
        "spirits": data["六獸"],
        "naJia": data["納甲"],
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa-site", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    sys.path.insert(0, args.qa_site)

    sxtwl = types.ModuleType("sxtwl")
    sxtwl.fromSolar = lambda *unused: None
    sys.modules["sxtwl"] = sxtwl

    import najia
    from najia.najia import Najia
    from ichingshifa.ichingshifa import Iching

    cast_time = "2026-07-14T12:00:00+08:00"
    tool_date = datetime(2026, 7, 14, 12, 0, tzinfo=timezone(timedelta(hours=8)))
    results = []
    for case in CASES:
        values = case["values"]
        najia_params = [{6: 4, 7: 1, 8: 2, 9: 3}[value] for value in values]
        najia_result = Najia(verbose=0).compile(params=najia_params, date=tool_date)
        najia_data = najia_result.data
        najia_raw = {
            "name": najia_data["name"],
            "changedName": najia_data["bian"]["name"] if najia_data["bian"] else najia_data["name"],
            "mark": najia_data["mark"],
            "palace": najia_data["gong"],
            "shiYing": list(najia_data["shiy"][:2]),
            "relations": najia_data["qin6"],
            "naJiaWithElement": najia_data["qinx"],
            "spirits": list(najia_data["god6"]),
            "movingLineIndexesZeroBased": najia_data["dong"],
            "calendar": najia_data["lunar"],
        }

        iching = Iching()
        original_code = "".join(str(value) for value in values)
        changed_values = [7 if value == 6 else 8 if value == 9 else value for value in values]
        changed_code = "".join(str(value) for value in changed_values)
        original = extract_iching(iching.decode_gua(original_code, najia_data["lunar"]["gz"]["day"]))
        changed = extract_iching(iching.decode_gua(changed_code, najia_data["lunar"]["gz"]["day"]))

        results.append({
            **case,
            "castTime": cast_time,
            "najia": najia_raw,
            "ichingshifa": {"original": original, "changed": changed},
        })

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "settings": {"lineOrder": "bottom-to-top", "castTime": cast_time, "timezone": "Asia/Shanghai"},
        "tools": {
            "najia": {"version": najia.__version__, "license": "MIT", "source": "https://github.com/bopo/najia"},
            "ichingshifa": {"version": "3.1.9", "license": "MIT", "source": "https://github.com/kentang2017/iching_shifa"},
        },
        "cases": results,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"saved {len(results)} cases to {output_path}")

if __name__ == "__main__":
    main()
