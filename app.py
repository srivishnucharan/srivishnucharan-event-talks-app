import re
import logging
from flask import Flask, jsonify, render_template, request
import feedparser
import requests

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed data
_cache = {
    "data": None,
    "last_updated": None
}

def parse_html_content(html_content):
    """
    Parses the feed entry's HTML content to split it into individual updates.
    A single date entry might contain multiple updates marked by <h3> tags.
    """
    # Regex to find <h3>(Type)</h3> and capture all content until the next <h3> or end of string
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL)
    matches = pattern.findall(html_content)
    updates = []
    
    for match in matches:
        update_type = match[0].strip()
        update_html = match[1].strip()
        
        # Clean HTML tags to get a plain text description for tweeting
        plain_text = re.sub(r'<[^<]+?>', '', update_html)
        plain_text = ' '.join(plain_text.split())
        
        updates.append({
            "type": update_type,
            "html": f"<h3>{update_type}</h3>{update_html}",
            "text": plain_text
        })
        
    if not updates:
        # Fallback if no <h3> tags are found
        plain_text = re.sub(r'<[^<]+?>', '', html_content)
        plain_text = ' '.join(plain_text.split())
        updates.append({
            "type": "Update",
            "html": html_content,
            "text": plain_text
        })
        
    return updates

def fetch_release_notes():
    """
    Fetches the BigQuery release notes Atom feed and parses it.
    """
    try:
        logger.info(f"Fetching release notes from {FEED_URL}")
        # Fetch using requests to handle headers and timeout nicely
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse the content
        feed = feedparser.parse(response.content)
        
        if feed.bozo:
            logger.warning("Feed parsing encountered a non-fatal XML error (bozo set). Continuing anyway.")
            
        parsed_entries = []
        for index, entry in enumerate(feed.entries):
            # Extract content html
            content_html = ""
            if "content" in entry and entry.content:
                content_html = entry.content[0].value
            elif "summary" in entry:
                content_html = entry.summary
                
            updates = parse_html_content(content_html)
            
            # Format update date
            date_str = entry.get("title", "Unknown Date")
            link = entry.get("link", "https://cloud.google.com/bigquery/docs/release-notes")
            
            parsed_entries.append({
                "id": entry.get("id", f"entry-{index}"),
                "date": date_str,
                "updated_raw": entry.get("updated", ""),
                "link": link,
                "updates": updates
            })
            
        return {
            "success": True,
            "entries": parsed_entries,
            "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
            "feed_updated": feed.feed.get("updated", "")
        }
    except Exception as e:
        logger.error(f"Error fetching or parsing feed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    # Check cache
    if not force_refresh and _cache["data"] is not None:
        logger.info("Serving release notes from cache")
        return jsonify(_cache["data"])
        
    result = fetch_release_notes()
    if result["success"]:
        _cache["data"] = result
        return jsonify(result)
    else:
        # If fetch fails and we have cached data, fallback to cache with a warning
        if _cache["data"] is not None:
            logger.warning("Fetch failed. Serving stale data from cache.")
            fallback_data = dict(_cache["data"])
            fallback_data["warning"] = "Could not refresh feed. Displaying cached data."
            return jsonify(fallback_data)
        return jsonify(result), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
