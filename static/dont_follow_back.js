let followersAcc = [];
let followingAcc = [];
let followersTotal = 0;
let followingTotal = 0;
let afterFollowers = null;
let afterFollowing = null;
let jobId = null;

async function runDontFollowBack() {
    const username = document.getElementById("username").value;
    const output = document.getElementById("output");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const statsBox = document.getElementById("stats-box");

    if (!username) {
        output.innerText = "Please enter a username.";
        return;
    }

    loader.style.display = "block";
    loaderText.innerText = "Loading Profile...";
    output.innerHTML = "";
    statsBox.style.display = "none";

    if (jobId === null) {
        followersAcc = [];
        followingAcc = [];
        afterFollowers = null;
        afterFollowing = null;
        followersTotal = 0;
        followingTotal = 0;

        const jobRes = await fetch("/start_job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        const jobData = await jobRes.json();

        if (jobData.error) {
            loader.style.display = "none";
            output.innerText = jobData.error;
            return;
        }

        jobId = jobData.job_id;
        followersTotal = jobData.followers_total || 0;
        followingTotal = jobData.following_total || 0;
    }

    await loadAll("followers");
    await loadAll("following");

    statsBox.style.display = "block";
    document.getElementById("stats-username").innerText = `${username}`;
    document.getElementById("followers-count").innerText = `Followers: ${followersTotal}`;
    document.getElementById("following-count").innerText = `Following: ${followingTotal}`;
    loader.style.display = "none";

    const dontFollowBack = followingAcc.filter(u => !followersAcc.includes(u));
    renderList(dontFollowBack, `People Who Don't Follow You Back (${dontFollowBack.length})`);
}

async function loadBatch(type) {
    const res = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, type })
    });
    const data = await res.json();

    if (data.error) {
        document.getElementById("output").innerText = data.error;
        return;
    }

    if (type === "followers") {
        followersAcc.push(...data.users.filter(u => !followersAcc.includes(u)));
        afterFollowers = data.next_cursor;
        followersTotal = data.total_count;
    } else {
        followingAcc.push(...data.users.filter(u => !followingAcc.includes(u)));
        afterFollowing = data.next_cursor;
        followingTotal = data.total_count;
    }
}

async function loadAll(type) {
    const loaderText = document.getElementById("loader-text");

    if ((type === "followers" && followersAcc.length === 0) || (type === "following" && followingAcc.length === 0)) {
        await loadBatch(type);
    }

    while ((type === "followers" && afterFollowers) || (type === "following" && afterFollowing)) {
        await loadBatch(type);
        loaderText.innerHTML = `<p>Loading Profile: Followers ${followersAcc.length}/${followersTotal}, Following ${followingAcc.length}/${followingTotal}</p>`;
    }

    loaderText.innerHTML = `<p>Profile Loaded: Followers ${followersAcc.length}/${followersTotal}, Following ${followingAcc.length}/${followingTotal}</p>`;
}

function renderList(list, title) {
    const output = document.getElementById("output");
    output.innerHTML = `<h3>${title}</h3>`;
    list.forEach((u, i) => {
        const div = document.createElement("div");
        div.className = "follower";
        div.innerHTML = `<button onclick="window.open('https://instagram.com/${u}','_blank')">${i + 1}. ${u}</button>`;
        output.appendChild(div);
    });
}