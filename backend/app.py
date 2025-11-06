"""
Flask backend for token analysis using tiktoken.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import tiktoken
import re

app = Flask(__name__)
CORS(app)

def get_word_count(text):
    """Simple word count implementation."""
    return len(re.findall(r'\w+', text))

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyzes a single text for token count, word count, and returns token IDs.
    
    Expects JSON: {"text": "your text here", "encoding": "cl100k_base"}
    Returns JSON: {
        "token_count": 1234,
        "word_count": 800,
        "tokens": [1, 2, 3...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        encoding_name = data.get('encoding', 'cl100k_base')
        
        try:
            encoding = tiktoken.get_encoding(encoding_name)
        except ValueError:
            return jsonify({'error': f'Invalid encoding: {encoding_name}'}), 400

        tokens = encoding.encode(text)
        token_count = len(tokens)
        word_count = get_word_count(text)
            
        return jsonify({
            'token_count': token_count,
            'word_count': word_count,
            'tokens': tokens
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch_tokenize', methods=['POST'])
def batch_tokenize():
    """
    Tokenizes a list of texts.
    
    Expects JSON: {"texts": ["text 1", "text 2"], "encoding": "cl100k_base"}
    Returns JSON: {"results": [{"token_count": 123, "word_count": 80}, ...]}
    """
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data or not isinstance(data['texts'], list):
            return jsonify({'error': 'No texts provided in a list'}), 400
        
        texts = data['texts']
        encoding_name = data.get('encoding', 'cl100k_base')

        try:
            encoding = tiktoken.get_encoding(encoding_name)
        except ValueError:
            return jsonify({'error': f'Invalid encoding: {encoding_name}'}), 400

        results = []
        for text in texts:
            tokens = encoding.encode(text)
            results.append({
                'token_count': len(tokens),
                'word_count': get_word_count(text)
            })
            
        return jsonify({'results': results}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/compare_tokenizers', methods=['POST'])
def compare_tokenizers():
    """
    Compare token counts for a single text across multiple tokenizers.
    
    Expects JSON: {"text": "your text here", "encodings": ["cl100k_base", "p50k_base"]}
    Returns JSON: {"results": {"cl100k_base": 1234, "p50k_base": 1235}}
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data or 'encodings' not in data:
            return jsonify({'error': 'Missing text or encodings in request'}), 400

        text = data['text']
        encodings = data['encodings']
        results = {}

        for encoding_name in encodings:
            try:
                encoding = tiktoken.get_encoding(encoding_name)
                tokens = encoding.encode(text)
                results[encoding_name] = len(tokens)
            except ValueError:
                results[encoding_name] = "Invalid encoding"
            except Exception as e:
                results[encoding_name] = str(e)

        return jsonify({'results': results}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)