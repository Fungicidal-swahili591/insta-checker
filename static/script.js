let followersAcc = [];
let followingAcc = [];
let followersTotal = 0;
let followingTotal = 0;
let afterFollowers = null;
let afterFollowing = null;
let jobId = null;

async function run(choice) {
    const username = document.getElementById("username").value;
    const output = document.getElementById("output");
    const loader = document.getElementById("loader");
    const loaderText = document.getElementById("loader-text");
    const statsBox = document.getElementById("stats-box");

    if (!username) {
        output.innerHTML = `<p>Please enter a username.</p>`;
        return;
    }

    loader.style.display = "block";
    loaderText.innerHTML = `<p>Loading Profile...</p>`;
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
            output.innerHTML = `<p>${jobData.error}</p>`;
            return;
        }

        jobId = jobData.job_id;
        followersTotal = jobData.followers_total;
        followingTotal = jobData.following_total;
    }

    if (choice === "1") output.innerHTML = `<p id="loading-followers">Loading Followers... ${followersAcc.length}/${followersTotal}</p>`;
    if (choice === "2") output.innerHTML = `<p id="loading-following">Loading Following... ${followingAcc.length}/${followingTotal}</p>`;

    if (followersAcc.length === 0) await loadBatch("followers");
    if (followingAcc.length === 0) await loadBatch("following");

    if (document.getElementById("loading-followers")) {
        document.getElementById("loading-followers").innerHTML = `<p>Loaded Followers! (${followersAcc.length}/${followersTotal})</p>`;
    }
    if (document.getElementById("loading-following")) {
        document.getElementById("loading-following").innerHTML = `<p>Loaded Following! (${followingAcc.length}/${followingTotal})</p>`;
    }

    statsBox.style.display = "block";
    document.getElementById("stats-username").innerText = `${username}`;
    document.getElementById("followers-count").innerText = `Followers: ${followersTotal}`;
    document.getElementById("following-count").innerText = `Following: ${followingTotal}`;
    loader.style.display = "none";

    if (choice === "1") {
        renderList(followersAcc, `Followers (${followersAcc.length}/${followersTotal})`);
    } else if (choice === "2") {
        renderList(followingAcc, `Following (${followingAcc.length}/${followingTotal})`);
    }
}

async function loadBatch(type) {
    const res = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, type })
    });
    const data = await res.json();

    if (data.error) {
        document.getElementById("output").innerHTML = `<p>${data.error}</p>`;
        return;
    }

    if (type === "followers") {
        followersAcc.push(...data.users.filter(u => !followersAcc.includes(u)));
        afterFollowers = data.next_cursor;
    } else {
        followingAcc.push(...data.users.filter(u => !followingAcc.includes(u)));
        afterFollowing = data.next_cursor;
    }
}

async function loadAll(type) {
    const loaderText = document.getElementById("loader-text");

    while ((type === "followers" && afterFollowers) || (type === "following" && afterFollowing)) {
        await loadBatch(type);
        if (type === "followers") {
            loaderText.innerHTML = `<p>Loading Followers... ${followersAcc.length}/${followersTotal}</p>`;
        } else {
            loaderText.innerHTML = `<p>Loading Following... ${followingAcc.length}/${followingTotal}</p>`;
        }
    }

    if (type === "followers") loaderText.innerHTML = `<p>Loaded Followers! (${followersAcc.length}/${followersTotal})</p>`;
    if (type === "following") loaderText.innerHTML = `<p>Loaded Following! (${followingAcc.length}/${followingTotal})</p>`;
}

function renderList(list, title) {
    const username = document.getElementById("username").value;
    const output = document.getElementById("output");

    output.innerHTML = `<h3>${username}'s Recent ${title}</h3>`;

    list.forEach((u, i) => {
        const div = document.createElement("div");
        div.className = "follower";
        div.innerHTML = `<button onclick="window.open('https://instagram.com{u}','_blank')">${i + 1}. ${u}</button>`;
        output.appendChild(div);
    });

    addLoadButtons(title);
}

function addLoadButtons(title) {
    const output = document.getElementById("output");

    if (title.startsWith("Followers") && afterFollowers) {
        const btn = document.createElement("button");
        btn.id = "load-more";
        btn.innerText = `Load More Followers (${followersAcc.length}/${followersTotal})`;
        btn.onclick = async () => {
            btn.innerText = "Loading...";
            btn.disabled = true;
            await loadBatch("followers");
            renderList(followersAcc, `Followers (${followersAcc.length}/${followersTotal})`);
            btn.innerText = `Load More Followers (${followersAcc.length}/${followersTotal})`;
            btn.disabled = false;
        };
        output.appendChild(btn);
    }

    if (title.startsWith("Following") && afterFollowing) {
        const btn = document.createElement("button");
        btn.id = "load-more";
        btn.innerText = `Load More Following (${followingAcc.length}/${followingTotal})`;
        btn.onclick = async () => {
            btn.innerText = "Loading...";
            btn.disabled = true;
            await loadBatch("following");
            renderList(followingAcc, `Following (${followingAcc.length}/${followingTotal})`);
            btn.innerText = `Load More Following (${followingAcc.length}/${followingTotal})`;
            btn.disabled = false;
        };
        output.appendChild(btn);
    }
}