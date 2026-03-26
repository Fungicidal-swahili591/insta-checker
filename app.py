from flask import Flask, render_template, request, jsonify
import requests
import json
import random
import time
import os
import uuid

app = Flask(__name__)

SESSION_ID = os.getenv("SESSION_ID")

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "*/*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.instagram.com/"
}

session = requests.Session()
session.headers.update(HEADERS)
session.cookies.update({"sessionid": SESSION_ID})

jobs = {}

def get_user_id(username):
    url = f"https://www.instagram.com/web/search/topsearch/?query={username}"
    r = session.get(url)

    if r.status_code != 200:
        return None

    try:
        data = r.json()
    except:
        return None

    for u in data.get("users", []):
        if u["user"]["username"].lower() == username.lower():
            return u["user"]["pk"]

    return None


def get_users(user_id, edge_type, after_cursor=None):

    time.sleep(random.uniform(1, 1.5))

    variables = {
        "id": user_id,
        "include_reel": True,
        "fetch_mutual": True,
        "first": 100,
        "after": after_cursor
    }

    if edge_type == "followers":
        query_hash = "c76146de99bb02f6415203be841dd25a"
        edge_field = "edge_followed_by"
    else:
        query_hash = "d04b0a864b4b54837c0d870b0e77e076"
        edge_field = "edge_follow"

    url = f"https://www.instagram.com/graphql/query/?query_hash={query_hash}&variables={json.dumps(variables)}"

    r = session.get(url)

    data = r.json()

    try:
        edges = data["data"]["user"][edge_field]["edges"]
    except KeyError:
        return [], False, None, 0

    users = [e["node"]["username"] for e in edges]

    page_info = data["data"]["user"][edge_field]["page_info"]

    total_count = data["data"]["user"][edge_field]["count"]

    after_cursor = page_info["end_cursor"] if page_info["has_next_page"] else None

    has_more = page_info["has_next_page"]

    return users, has_more, after_cursor, total_count


def fetch_all_batches(job, edge_type):

    cursor = job[f"{edge_type}_cursor"]
    user_list = job[edge_type]

    while True:

        users, has_more, next_cursor, total_count = get_users(
            job["user_id"], edge_type, cursor
        )

        user_list.extend([u for u in users if u not in user_list])

        cursor = next_cursor

        job[f"{edge_type}_cursor"] = next_cursor
        job[f"{edge_type}_total"] = total_count

        if not has_more:
            break

    return user_list


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/dont-follow-back")
def follow():
    return render_template("dont-follow-back.html")


@app.route("/privacy")
def privacy():
    return render_template("privacy.html")


@app.route("/terms")
def terms():
    return render_template("terms.html")

@app.route("/ads.txt")
def ads():
    return render_template("ads.txt")

@app.route("/start_job", methods=["POST"])
def start_job():

    data = request.get_json()
    username = data.get("username")

    user_id = get_user_id(username)

    if not user_id:
        return jsonify({"error": "Username not found"}), 404

    followers, _, _, followers_total = get_users(user_id, "followers")
    following, _, _, following_total = get_users(user_id, "following")

    MAX_COUNT = 5000

    if followers_total > MAX_COUNT or following_total > MAX_COUNT:
        return jsonify({
            "error": f"Account too large to process. Followers: {followers_total}, Following: {following_total}. Max allowed: {MAX_COUNT}"
        }), 400

    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "user_id": user_id,

        "followers": followers,
        "following": following,

        "followers_set": set(followers),
        "following_set": set(following),

        "followers_cursor": None,
        "following_cursor": None,

        "followers_total": followers_total,
        "following_total": following_total
    }

    return jsonify({
        "job_id": job_id,
        "followers_total": followers_total,
        "following_total": following_total
    })


@app.route("/users", methods=["POST"])
def fetch_users_endpoint():

    data = request.get_json()

    job_id = data.get("job_id")
    edge_type = data.get("type")

    job = jobs.get(job_id)

    if not job:
        return jsonify({"error": "Invalid job id"}), 400

    cursor = job[f"{edge_type}_cursor"]

    users, has_more, next_cursor, total_count = get_users(
        job["user_id"], edge_type, cursor
    )

    job[edge_type].extend([u for u in users if u not in job[edge_type]])

    job[f"{edge_type}_set"].update(users)

    job[f"{edge_type}_cursor"] = next_cursor
    job[f"{edge_type}_total"] = total_count

    loaded = len(job[edge_type])

    return jsonify({
        "users": users,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "loaded": loaded,
        "total_count": total_count
    })


@app.route("/dont_follow_back", methods=["POST"])
def dont_follow_back():

    data = request.get_json()

    job_id = data.get("job_id")

    job = jobs.get(job_id)

    if not job:
        return jsonify({"error": "Invalid job id"}), 400

    result = list(job["following_set"] - job["followers_set"])

    return jsonify({
        "dont_follow_back": result,
        "count": len(result)
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)