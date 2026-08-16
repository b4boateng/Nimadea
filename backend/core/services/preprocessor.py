import re

# Standard set of English stopwords to filter out common, low-value words
STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their", 
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once"
}

def preprocess_text(text):
    """
    Cleans raw text by lowercasing, stripping punctuation, and removing stopwords.
    Returns a list of meaningful tokens.
    """
    # 1. Convert to lowercase
    text = text.lower()
    
    # 2. Remove all punctuation using Regex
    text = re.sub(r'[^\w\s]', '', text)
    
    # 3. Tokenize by splitting on spaces
    tokens = text.split()
    
    # 4. Filter out stopwords
    cleaned_tokens = [word for word in tokens if word not in STOPWORDS]
    
    return cleaned_tokens