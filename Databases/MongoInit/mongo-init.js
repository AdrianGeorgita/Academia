db = db.getSiblingDB('admin');

function userExists(username) {
  var users = db.getUsers ? db.getUsers() : [];
  for (var i = 0; i < users.length; i++) {
    if (users[i].user === username) {
      return true;
    }
  }
  return false;
}

if (!userExists('dbAdmin')) {
  db.createUser({
    user: "dbAdmin",
    pwd: "7dddb0ee38fa7f35cb9f33d501c4b77c6088de8535a2232183bebdfe34073443",
    roles: [
      { role: "userAdminAnyDatabase", db: "admin" },
      { role: "root", db: "admin" }
    ]
  });
}

db.auth("dbAdmin", "7dddb0ee38fa7f35cb9f33d501c4b77c6088de8535a2232183bebdfe34073443");

db = db.getSiblingDB('academia');
db.createCollection('lecture');

if (!userExists('dbOwnerUser')) {
  db.createUser({
    user: "dbOwnerUser",
    pwd: "48443eeee2872ca7740b840b7d9915e8f07096ff836a39fea48883d4f4c0534c",
    roles: [
      { role: "dbOwner", db: "academia" }
    ]
  });
}

if (!userExists('dbUser')) {
  db.createUser({
    user: "dbUser",
    pwd: "d66c0d5d816f74a56a1ad6e15a58e2b342a3f59bb9390601272aa1260e0c750c",
    roles: [
      { role: "readWrite", db: "academia" }
    ]
  });
}