"""
Flask backend for token analysis using tiktoken.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import re

# tiktoken is optional at runtime; provide a fallback tokenizer when it's not available
try:
    import tiktoken
    HAVE_TIKTOKEN = True
except Exception:
    tiktoken = None
    HAVE_TIKTOKEN = False
import io
import zipfile
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

def get_word_count(text):
    """Simple word count implementation."""
    return len(re.findall(r'\w+', text))


def get_encoding(name='cl100k_base'):
    """Return a tokenizer-like object with an encode(text) method.
    If tiktoken is available, use it; otherwise fall back to a simple whitespace/punctuation tokenizer.
    """
    if HAVE_TIKTOKEN:
        try:
            return tiktoken.get_encoding(name)
        except Exception:
            return tiktoken.get_encoding('cl100k_base')

    # fallback simple encoding
    class SimpleEncoding:
        def encode(self, text):
            # return list of tokens (strings) for length calculation
            # split on word boundaries; this is only an approximation
            return re.findall(r"\w+|[^\s\w]", text)

    return SimpleEncoding()

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


@app.route('/api/count-tokens', methods=['POST'])
def count_tokens():
    """
    Accepts multipart/form-data with files named file0, file1, ... or arbitrary keys.
    - For .txt and .md files: read text and tokenize
    - For .zip files: unzip in-memory and process contained .txt/.md files
    Returns JSON: { files: [{name, token_count, words, chars}], total_tokens }
    """
    try:
        if not request.files:
            return jsonify({'error': 'No files uploaded'}), 400

        encoding_name = request.form.get('encoding', 'cl100k_base')
        try:
            encoding = tiktoken.get_encoding(encoding_name)
        except Exception:
            # fallback to cl100k_base if provided name invalid
            encoding = tiktoken.get_encoding('cl100k_base')

        results = []
        total_tokens = 0

        for key in request.files:
            storage = request.files.get(key)
            if not storage:
                continue
            filename = secure_filename(storage.filename or key)
            name_lower = filename.lower()

            # read file content into memory
            data = storage.read()

            if name_lower.endswith('.zip'):
                # process zip archive in-memory
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as z:
                        for member in z.namelist():
                            # skip directories
                            if member.endswith('/'):
                                continue
                            if not (member.lower().endswith('.txt') or member.lower().endswith('.md')):
                                continue
                            with z.open(member) as f:
                                try:
                                    text = f.read().decode('utf-8')
                                except Exception:
                                    text = f.read().decode('latin-1', errors='replace')
                                tokens = encoding.encode(text)
                                token_count = len(tokens)
                                word_count = len(re.findall(r'\w+', text))
                                char_count = len(text)
                                results.append({'name': f"{filename}/{member}", 'token_count': token_count, 'words': word_count, 'chars': char_count})
                                total_tokens += token_count
                except zipfile.BadZipFile:
                    return jsonify({'error': f'Bad zip file: {filename}'}), 400
            else:
                # treat as plain text file
                try:
                    text = data.decode('utf-8')
                except Exception:
                    text = data.decode('latin-1', errors='replace')

                tokens = encoding.encode(text)
                token_count = len(tokens)
                word_count = len(re.findall(r'\w+', text))
                char_count = len(text)
                results.append({'name': filename, 'token_count': token_count, 'words': word_count, 'chars': char_count})
                total_tokens += token_count

        return jsonify({'files': results, 'total_tokens': total_tokens}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)