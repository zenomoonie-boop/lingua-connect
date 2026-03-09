import os

from flask import Flask, jsonify, request
from openai import OpenAI


app = Flask(__name__)


def get_openai_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=api_key)


@app.route("/", methods=["GET"])
def healthcheck():
    return jsonify({"status": "ok"}), 200


@app.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    user_message = payload.get("message")

    if not user_message or not isinstance(user_message, str):
        return jsonify({"error": "A non-empty 'message' field is required."}), 400

    try:
        client = get_openai_client()
        completion = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "You are an AI tutor. Give clear, helpful, concise answers "
                                "that support learning."
                            ),
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_message}],
                },
            ],
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return jsonify({"error": f"OpenAI request failed: {exc}"}), 502

    return jsonify({"response": completion.output_text}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
