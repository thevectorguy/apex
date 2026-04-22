db = db.getSiblingDB("mycoach");

db.createUser({
    user: "arjun",
    pwd: "mycoach_pass",
    roles: [
        {
            role: "readWrite",
            db: "mycoach"
        }
    ]
});