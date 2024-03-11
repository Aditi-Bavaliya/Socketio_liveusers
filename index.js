const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const fs = require("fs");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const path = require("path");

const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server);


app.use(express.static(path.join(__dirname, "public")));

mongoose.connect('mongodb+srv://user:bQOYWIRYMPEsVQBR@displayuser.qi0i1bu.mongodb.net/Liveusers?retryWrites=true&w=majority',{
  UseNewUrlParser: true, 
  UseUnifiedTopology: true
}).then(()=>{
  console.log("Connected to atlas db");
})
.catch((e)=>{
  console.log(e);
});

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

let new_user_id = "";

const fname = "";
let active_users = {};

const UserSchema = new mongoose.Schema({
  FIRST_NAME: String,
  LAST_NAME: String,
  CONTACT: Number,
  EMAIL: String,
  CITY: String,
  STATE: String,
  COUNTRY: String,
  LOGIN: String,
  PASSWORD: String,
  creation_time: Date,
  last_updated_on: Date,
});

const UserModel = mongoose.model("User", UserSchema);

app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "./public/home.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
    } else {
      res.status(200).type("text/html").send(data);
    }
  });
});

app.get("/signup", (req, res) => {
  const filePath = path.join(__dirname, "./public/signup.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
    } else {
      res.status(200).type("text/html").send(data);
    }
  });
});


app.post("/signup", (req, res) => {
  const data = req.body;
  const now = new Date();
  const formattedDate = now.toISOString();
  const creation_time = {
    currentTime: formattedDate,
  };

  data.creation_time = formattedDate;
  const newUser = new UserModel(data);
  newUser
    .save()
    .then((savedUser) => {
      const userId = savedUser._id.toString(); 
      console.log("Data inserted with ID:", userId);
      new_user_id = userId;
      res.setHeader("Content-Type", "text/html");
    })

    .catch((err) => console.error("Error inserting document:", err));
});

app.get("/login", (req, res) => {
  const filePath = path.join(__dirname, "public/login.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
    } else {
      res.status(200).type("text/html").send(data);
    }
  });
});


app.post("/login-page", (req, res) => {
  const data = req.body;

  UserModel.find({ LOGIN: data.id })
    .then((users) => {
      if (users.length === 0) {
        res.status(404).json({ error: "No user found " });
      } else {
        const user = users.find((user) => user.PASSWORD === data.password);
        if (user) {
          console.log("Valid password");
          console.log(user);
          res.json({ success: true });
          active_users[user.id] = user.FIRST_NAME;

          setTimeout(() => {
            // Render the page after the delay
            // res.render("", { active_users });
          }, 3000);
        } else {
          console.log("Invalid password");
          res.status(401).json({ error: "Invalid password" });
        }
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});



io.on("connection", (socket) => {
  console.log("CONNECTED TO SOCKET", socket.id);

  let fname = "";

  socket.join("live-users");

  socket.on("name", (name) => {
    // fname = name; // Update fname when receiving the name event
    // id_nd_name[new_user_id]=name;
    // console.log(new_user_id,'line 181')
    active_users[new_user_id] = name;

    // active_users.push(id_nd_name);

    // Object.assign(active_users, id_nd_name);
    console.log("PUSHED TO THE ARRAY");
    console.log(active_users);
  });

  socket.on("fetch-data", async (id) => {
    console.log("Got data", id);

    const userId = id;
    console.log("Line 199", userId);
    try {
      
      const user = await UserModel.findById(userId);
      if (!user) {
        console.log("User not found");
        socket.emit("user-not-found", userId); 
        return; 
      }
      
      console.log("User found:", user);
      socket.emit("user-details", user); 
    } catch (err) {
      console.error("Error fetching user details:", err);
      
    }
  });

  socket.on("disconnect", () => {
    if (active_users.hasOwnProperty(new_user_id)) {
      delete active_users[new_user_id];
    }
  });

  socket.emit("connected-users", active_users);
});

app.get("/new-page", (req, res) => {
  res.render("list_of_users", { active_users, socketId: req.query.socketId });
});

app.get("/display-detail", async (req, res) => {
  const userId = req.body;
  console.log("line 215", userId);
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    res.json(user); 
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).send("Internal Server Error");
  }
});

server.listen(PORT, console.log(`Server is running on http://localhost:${PORT}`));
