//Importing libraries
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import mysql from "mysql";
import bodyParser from "body-parser";
const __dirname = dirname(fileURLToPath(import.meta.url));
import session from "express-session";
import fileUpload from "express-fileupload";
import multer from "multer"
//Constants
const app = express();
const port = 8000;


//Body barser use
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

//Connection To Database
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "clm",
});

connection.connect((err) => {
    if (err) {
        console.error("cant connect to the database", err);
        return;
    }
    console.log("connected successfully to the database");
});

//Uses public - views - json - serUser middleware
app.use('/public', express.static(path.join(__dirname, '/public')));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, '/views')));
app.use(express.static("views"));
// Apply middleware
app.use(express.json()); // For parsing application/json
app.set('view engine', 'ejs');
// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    console.log('Incoming request body:', req.body);
    console.log(req.session.email);
    next();
});
app.use(fileUpload());

app.get('/', (req, res) => {
    if (req.session.loggedIn) {
        if (req.session.role === 'club') {
            res.render('home', { loggedIn: true, role: "club", email: req.session.email });
        } else if (req.session.role === 'sks') {
            res.render('home', { loggedIn: true, role: "sks", email: req.session.email });
        }
    } else {
        res.render('home', { loggedIn: false, role: null, email: null });
    }
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    if (email && password) {
        connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
            if (results.length > 0) {
                req.session.loggedIn = true;
                req.session.loggedIn = true;
                req.session.email = email;
                req.session.role = results[0].role; // Add this line
                console.log(req.session.email);
                res.render('home', { loggedIn: true, role: results[0].role, email: req.session.email });
            } else {
                res.send('Incorrect email and/or password!');
            }
            res.end();
        });
    } else {
        res.send('Please enter email and password!');
        res.end();
    }
});

// Add a logout route
app.get('/logout', (req, res) => {
    // Clear the session
    req.session.destroy(err => {
        if (err) {
            console.log(err);
        } else {
            // Redirect to the login page
            res.render('home', { loggedIn: false, role: null, email: null });
        }
    });
});

app.get('/register', (req, res) => {
    res.render("register.ejs");
});


// Register route
app.post("/register", async (req, res) => {


    try {
        const { name, password, email, university_id, role } = req.body;
        let tableName = '';
        if (role === 'clubManager') {
            tableName = 'club_manager';
        } else if (role === 'sksAdmin') {
            tableName = 'sks_admin';
        } else {
            return res.status(400).send('Invalid role specified');
        }

        connection.query(
            `INSERT INTO ${tableName} (name, password, email, uni_id ) VALUES (?, ?, ?, ?)`,
            [name, password, email, university_id],
            (error, results, fields) => {
                if (error) {
                    console.error('Error inserting into database:', error);
                    return res.status(500).send('Failed to register');
                }
                res.status(200).send('Registration successful');
            }
        );

        console.log("user registered sucssessfully");

    } catch (e) {
        console.log(e);
    }

})
app.get("/myclubpage", (req, res) => {
    if (!req.session.loggedIn) {
        res.render('home.ejs', { loggedIn: false, role: null, email: null });
        return; // Make sure to return after sending the response
    }

    let email = req.session.email;

    connection.query("SELECT club_id from club_manager where email = ?", [email], (err, result) => {
        if (err) {
            console.error("Error fetching club id:", err);
            return res.status(500).send("Internal Server Error");
        }
        let clubID = result[0].club_id;
        console.log("club ID " + clubID);
        connection.query("SELECT * FROM club WHERE club_id = ?", clubID, (err, clubInformation) => {
            if (err) {
                console.error("Error fetching club information:", err);
                return res.status(500).send("Internal Server Error");
            }
            if (clubInformation.length === 0) {
                return res.status(500).send("Club Dosent Exist");
            }
            console.log(clubInformation + "club info")
            connection.query("select name from club_manager where club_id = ?", [clubID], (err, name) => {
                if (err) {
                    console.error("Error fetching Club manager name:", err);
                    return res.status(500).send("Internal Server Error");
                }
                console.log(clubInformation);
                connection.query("select * from event where club_id = ?", [clubID], (err, event) => {
                    if (err) {
                        console.error("Error fetching events:", err);
                        return res.status(500).send("Internal Server Error");
                    }

                    connection.query(`SELECT event_name FROM tempevents WHERE club_id = ?`, [clubID], (err, resultsTemp) => {
                        if (err) {
                            console.error("Error fetching temp events:", err);
                            return res.status(500).send("Internal Server Error");
                        }
                        console.log(resultsTemp);
                        // Extracting event IDs from the results of the first query

                        connection.query(`SELECT event_name, status, event_id FROM history_event WHERE club_id = ?`, [clubID], (err, resultsHistory) => {
                            if (err) {
                                console.error("Error fetching temp events:", err);
                                return res.status(500).send("Internal Server Error");
                            }
                            console.log(resultsHistory);

                            connection.query(`SELECT event_name, event_id FROM toshareevents WHERE club_id = ?`, [clubID], (err, resultsToShare) => {
                                if (err) {
                                    console.error("Error fetching temp events:", err);
                                    return res.status(500).send("Internal Server Error");
                                }
                                console.log(resultsToShare);
                                res.render("myclubpage.ejs", { clubInformation, name, role: 'club', email: req.session.email, loggedIn: req.session.loggedIn, event, resultsTemp, resultsHistory, resultsToShare });
                            });
                        });



                    });


                });
            });
        });
    });
});

app.post("/ToShareEvent", (req, res) => {
    const eventId = req.query.eventId;
    console.log("To share " + eventId);
    connection.query("SELECT * FROM toshareevents where event_id = ?", [eventId], (err, result) => {
        console.log("the selected result is");
        console.log(result);
        if (err) {
            console.log("error selecting from history event");
        } else {

            const eventData = result[0];
            console.log(eventData.club_id);
            const clubId = eventData.club_id;
            const eventId = eventData.event_id;
            const eventName = eventData.event_name;
            const guestName = eventData.guest_name;
            const eventDate = eventData.date;
            const eventTime = eventData.time;
            const eventLocation = eventData.location;
            const capacity = eventData.capacity;
            const description = eventData.description;
            const notes = eventData.notes;
            const category = eventData.category;
            const language = eventData.language;
            const uploadImage1 = eventData.uploadImage1;
            const clubMId = eventData.clm_id;

            connection.query(`INSERT INTO event (club_id, event_id, event_name, guest_name, date, time, language, location, capacity, description, notes, category,clm_id, event_img1) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [clubId, eventId, eventName, guestName, eventDate, eventTime, language, eventLocation, capacity, description, notes, category, clubMId, uploadImage1],
                (error, results, fields) => {
                    if (error) {
                        console.error('Error inserting event into database:', error);
                        return res.status(500).send('Failed to insert');
                    } else {
                        connection.query("Delete FROM toshareevents where event_id = ?", [eventId], (err, result) => {
                            if (err) {
                                console.error('Error inserting event into database:', error);
                                return res.status(500).send('Failed to insert');
                            } else {
                                res.redirect("/myclubpage");
                            }
                        });
                    }

                });
        }

    });

});

//to open social media link sin the database
app.get("/socialmedia/:link", (req, res) => {

    res.redirect("https://" + req.params.link);
});
app.get("/socialmedia/:link/:link2", (req, res) => {

    res.redirect("https://" + req.params.link + "/" + req.params.link2);
});

//Route eventRequests 

app.get("/eventRequests", (req, res) => {
    connection.query(`SELECT * FROM tempevents`, (err, results) => {
        if (err) {
            console.error("Error fetching temp events:", err);
            return res.status(500).send("Internal Server Error");
        }
        console.log(results);
        // Extracting event IDs from the results of the first query
        const eventIds = results.map(row => row.eventid);
        console.log(eventIds);

        // Performing a second query to fetch events based on the event IDs
        connection.query(`SELECT * FROM event WHERE event_id IN (?)`, [eventIds], (err, events) => {
            if (err) {
                console.error("Error fetching events:", err);
                return res.status(500).send("Internal Server Error");
            }
            console.log(events);
            res.render('eventRequests.ejs', { role: 'sks', email: req.session.email, loggedIn: true, tempevents: results, events });

        });





    });



});

app.get("/popupContent", (req, res) => {
    const buttonId = req.query.buttonId;
    const lastIndex = buttonId.lastIndexOf('_');
    const eventId = buttonId.substring(lastIndex + 1); // Extract the substring after the last '_'
    // Get the button ID from the query string

    console.log(eventId);
    // Fetch popup content based on button ID from the database or any other source
    console.log("this is the button id" + eventId);
    connection.query('SELECT * FROM tempevents where event_id = ?', [eventId],(err, results)=>{
        if(err){
            console.log('didnt get', err);
        }
        console.log({results});
        res.render('popupContent.ejs', { results });
    });
   
}); 
app.post("/approveEvent", (req, res) => {
    const eventId = req.query.eventId; // Retrieve eventId from the query string

    console.log("Received eventId:", eventId);

    connection.query('SELECT * FROM tempevents where event_id = ?', [eventId], (err, results) => {
        if (err) {
            console.error('Error fetching event data:', err);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Fetched event data:", results);

        // Assuming you want to insert the entire event data into the toshareevents table
        const eventData = JSON.stringify(results);
        

        connection.query('UPDATE tempevents SET status = 1 WHERE event_id = ?', [eventId], (err, result) => {
            if (err) {
                console.error("Error updating status in temporary events table:", err);
                return res.status(500).send("Internal Server Error");
            }

            console.log("Status updated in temporary events table");


        results.forEach(event => {
       
        
        // Loop through the results array
        event.status = 1; 
    // Insert each event from the results array into the toshareevents table
    connection.query('INSERT INTO toshareevents SET ?', [event], (err, result) => {
        if (err) {
            console.error("Error inserting event data into toshareevents:", err);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Event approved successfully!");
        // Optionally, handle the result or send a response to the client
    });

    
        
    connection.query('INSERT INTO history_event SET ?', [event], (err, result) => {
        if (err) {
            console.error("Error inserting event data into history of events", err);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Event approved successfully!");
        // Optionally, handle the result or send a response to the client
    });
     

    });
});

    });
});

app.get("/statusClubManager", (req, res) => {

    connection.query("SELECT club_id FROM club_manager WHERE email = ?", [email], (err, userResult) => {
        if (err) {
            console.error("Error fetching userID:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (userResult.length === 0) {
            return res.status(404).send("User not found");
        }

        const clubId = userResult[0].club_id;

        connection.query(`SELECT event_name FROM tempevents WHERE club_id(?)`, [clubId], (err, results) => {
            if (err) {
                console.error("Error fetching temp events:", err);
                return res.status(500).send("Internal Server Error");
            }
            console.log(results);
            // Extracting event IDs from the results of the first query
            const eventIds = results.map(row => row.eventid);
            console.log(eventIds);
            res.render('statusClubManager.ejs', { role: 'club', email: req.session.email, loggedIn: true, tempevents: results });
        });
    });
});


app.get("/createEvent", (req, res) => {
    res.render('createEvent.ejs');
});

app.post("/createEvent", async (req, res) => {
    console.log("The requuest is");
    const { uploadImage1 } = req.files;

    const imgPath = __dirname + '/public/' + uploadImage1.name
    // Move the uploaded image to our upload folder
    uploadImage1.mv(imgPath);

    const email = req.session.email; // Retrieve email from request body
    const { eventName, guestName, eventDate, eventTime, eventLocation, capacity, description, notes, category } = req.body;
    const language = req.body.language; // Get the selected language

    connection.query("SELECT user_id FROM users WHERE email = ?", [email], (err, userResult) => {
        if (err) {
            console.error("Error fetching userID:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (userResult.length === 0) {
            return res.status(404).send("User not found");
        }

        const userId = userResult[0].user_id;
        console.log("\n\nuser id", userId);

        connection.query("SELECT club_name FROM club WHERE clm_id = ?", [userId], (err, resultClubName) => {
            const clubName = resultClubName[0].club_name;

            connection.query("SELECT club_id FROM club WHERE clm_id = ?", [userId], (err, clubResult) => {
                if (err) {
                    console.error("Error fetching club id:", err);
                    return res.status(500).send("Internal Server Error");
                }
                if (clubResult.length === 0) {
                    return res.status(404).send("Club not found for the user");
                }

                const clubId = clubResult[0].club_id;

                connection.query(
                    `INSERT INTO tempevents (club_id, event_name, guest_name, date, time, language, location, capacity, description, notes, category, clm_id, club_name, imageUrl)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [clubId, eventName, guestName, eventDate, eventTime, language, eventLocation, capacity, description, notes, category, userId, clubName, imgPath],
                    (error, results, fields) => {
                        if (error) {
                            console.error('Error inserting event into database:', error);
                            return res.status(500).send('Failed to insert');
                        }
                        res.redirect("/myclubpage");
                    });

            });

        });


    });
});


//Route createClub
app.get("/createclub", (req, res) => {

    res.render("on_click_create_club.ejs", { role: 'sks', email: req.session.email, loggedIn: true });
});

app.post("/clubform", async (req, res) => {
    const name = req.body.name;
    const cars = req.body.cars;
    const manager = req.body.manager;
    const bio = req.body.bio;
    const number = req.body.number;
    const media1 = req.body.media1;
    const media2 = req.body.media2;
    const media3 = req.body.media3;
    const email = req.body.email;


    connection.query('INSERT INTO club(club_name, category, clm_id, bio, contact, social_media1, social_media2, social_media3, email) VALUES(?,?,?,?,?,?,?,?,?)',
        [name, cars, manager, bio, number, media1, media2, media3, email], (err, result) => {
            if (err) {
                console.error("Error inserting club:", error);
                res.status(500).send("Error creating club");
                return;
            }
            console.log("Club successfully created");
            res.send('Club successfully created');
        });
});

app.post("/rejectMessage", async (req, res) => {
    const rejectionReason = req.body.rejectionReason;
    const eventid = req.query.eventid;
    console.log(rejectionReason);
    console.log(eventid);

    connection.query('SELECT sks_id from sks_admin WHERE email=?', [req.session.email], (err, result) => {
        if (err) {
            console.error("Error getting sks id:", error);
            res.status(500).send("Error creating club");
            return;
        }
        const sksid = result[0].sks_id;
      const eventId = req.query.eventId; // Retrieve eventId from the query string
        
            console.log("Received eventId:", eventId);
        
            connection.query('SELECT * FROM tempevents where event_id = ?', [eventId], (err, results) => {
                if (err) {
                    console.error('Error fetching event data:', err);
                    return res.status(500).send("Internal Server Error");
                }
        
                console.log("Fetched event data:", results);
        
                // Assuming you want to insert the entire event data into the toshareevents table
                const eventData = JSON.stringify(results);
                
        
                connection.query('UPDATE tempevents SET status = 0 WHERE event_id = ?', [eventId], (err, result) => {
                    if (err) {
                        console.error("Error updating status in temporary events table:", err);
                        return res.status(500).send("Internal Server Error");
                    }
        
                    console.log("Status updated in temporary events table");
        
        
                results.forEach(event => {
               
                
                // Loop through the results array
                event.status = 0; 
        
            connection.query('INSERT INTO history_event SET ?', [event], (err, result) => {
                if (err) {
                    console.error("Error inserting event data into history of events", err);
                    return res.status(500).send("Internal Server Error");
                }
        
                console.log("Event rejected successfully!");
                // Optionally, handle the result or send a response to the client
            });
             
        
            });
            connection.query('INSERT INTO history_event(comment) where event_id=?', [eventId], (err, result) => {
                if (err) {
                    console.error("Error inserting event data into history of events", err);
                    return res.status(500).send("Internal Server Error");
                }
        
                console.log("Event rejected successfully!");
                // Optionally, handle the result or send a response to the client
            });

        });
        
            });
        });


        


    });



//Route Comparing 
app.get("/comparing", (req, res) => {
    // Query to retrieve data from the 'TempPosts' table
    connection.query("SELECT * FROM TempPosts", (err, TempPosts) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send("Internal Server Error2");
        }

        // Query to retrieve data from the 'PostEditRequests' table
        connection.query("SELECT * FROM PostEditRequests", (err, PostEditRequests) => {
            if (err) {
                console.log(err.message);
                return res.status(500).send("Internal Server Error2");
            }

            // Array to store promises for fetching club names for TempPosts
            const tempPromises = [];

            // Iterate over each item in TempPosts to fetch club names asynchronously
            TempPosts.forEach(item => {
                // Create a promise for each query to fetch club name
                const promise = new Promise((resolve, reject) => {
                    connection.query("SELECT club_name FROM club WHERE club_id = ?", [item.club_id], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            // Resolve the promise with club name or null if not found
                            resolve(result.length > 0 ? result[0].club_name : null);
                        }
                    });
                });
                // Push the promise to the array of promises
                tempPromises.push(promise);
            });

            // Array to store promises for fetching club names for PostEditRequests
            const postPromises = [];

            // Iterate over each item in PostEditRequests to fetch club names asynchronously
            PostEditRequests.forEach(item => {
                // Create a promise for each query to fetch club name
                const promise = new Promise((resolve, reject) => {
                    connection.query("SELECT club_name FROM club WHERE club_id = ?", [item.club_id], (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            // Resolve the promise with club name or null if not found
                            resolve(result.length > 0 ? result[0].club_name : null);
                        }
                    });
                });
                // Push the promise to the array of promises
                postPromises.push(promise);
            });

            // Wait for all promises to resolve using Promise.all
            Promise.all([...tempPromises, ...postPromises])
                .then(clubNames => {
                    // Combine data from TempPosts and PostEditRequests into a single array
                    const combinedData = [...TempPosts, ...PostEditRequests];
                    // Render the 'StatusManager.ejs' template with the combined data and club names
                    res.render("StatusManager.ejs", { combinedData, clubNames });
                })
                .catch(err => {
                    console.error(err);
                    // Handle error appropriately
                    return res.status(500).send("Internal Server Error");
                });
        });
    });
});


app.get("/ezz", (req, res) => {
    connection.query("select * from event where clm_id = 1", (err, result) => {
        if (err) {
            console.log(err.message);
        }
        connection.query("select club_name from club where clm_id = 1", (err, clubname) => {
            console.log(clubname);
            res.render("showingezz.ejs", { result, clubname });
        });
    });

});
app.get("/getOldPicture", (req, res) => {
    const clubId = req.query.clubId;

    connection.query("SELECT old_picture_url FROM club WHERE club_id = ?", [clubId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }

        // Assuming result is an array with a single object containing the old picture URL
        const oldPictureUrl = result.length > 0 ? result[0].old_picture_url : null;

        res.json({ oldPictureUrl });
    });
});

function getUserID(email, callback) {
    connection.query("SELECT user_id FROM users WHERE email = ?", [email], (err, result) => {
        if (err) {
            console.error(err);
            callback(err, null);
            return;
        }
        const userId = result.length > 0 ? result[0].user_id : null;
        callback(null, userId);
    });
}

app.get("/tryID", (req, res) => {
    let email = req.session.email;
    getUserID(email, (err, userId) => {
        if (userId !== null && userId !== undefined) {
            res.send(userId.toString()); // Assuming userId is a number
            console.log("User ID:", userId);
        } else {
            res.status(404).send("Error"); // Or another appropriate status code
        }
    });
});


app.get('/singleclubpage', (req, res) => {

    const clubID = 23;
    connection.query("SELECT * FROM club WHERE club_id = ?", clubID, (err, clubInformation) => {
        if (err) {
            console.error("Error fetching club information:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (clubInformation.length === 0) {
            return res.status(500).send("Club Dosent Exist");
        }
        connection.query("select name from club_manager where club_id = ?", [clubID], (err, name) => {
            if (err) {
                console.error("Error fetching Club manager name:", err);
                return res.status(500).send("Internal Server Error");
            }
            connection.query("select * from event where club_id = ?", [clubID], (err, event) => {
                if (err) {
                    console.error("Error fetching events:", err);
                    return res.status(500).send("Internal Server Error");
                }
                res.render("myclubpage.ejs", { clubInformation, name, loggedIn: false, event });
            });

        });
    });

});

app.post('/updateProfile', (req, res) => {
    // Extract data from the request body
    const email = req.session.email;
    connection.query("SELECT club_id FROM club_manager WHERE email = ?", [email], (err, result) => {
        if (err) {
            console.log("Error fetching club id:", err.message);
            return res.status(500).send("Internal Server Error");
        }
        const clubid = result[0].club_id;
        console.log("Club ID fetched:", clubid);
        connection.query("SELECT * FROM club WHERE club_id = ?", [clubid], (err, clubResult) => {
            if (err) {
                console.log("Error fetching club details:", err.message);
                return res.status(500).send("Internal Server Error");
            }
            // Extract content from the request body
            const contentKeys = Object.keys(req.body).filter(key => key.endsWith('_content'));
            const contents = contentKeys.map(key => req.body[key].trim());

            // Extract content from the club details fetched from the database
            const clubContents = clubResult.map(row => Object.values(row)).flat();

            // Check if any content is found in the club details
            const newContents = contents.filter(content => !clubContents.includes(content));

            // Map contentKeys to requestType
            const requestTypeMap = {
                'club_name_content': 'New Club Name',
                'category_content': 'New Category',
                'bio_content': 'New BIO',
                'email_content': 'New Email'
            };

            // Insert new contents into the database
            for (const contentKey of contentKeys) {
                const requestType = requestTypeMap[contentKey];
                const newContent = req.body[contentKey].trim();
                if (newContents.includes(newContent)) {
                    console.log(`Inserting new content: "${newContent}" with requestType: "${requestType}"`);
                    // Insert data into tempprofile table
                    connection.query("INSERT INTO tempprofile (club_id, input, requestType) VALUES (?, ?, ?)", [clubid, newContent, requestType], (err, result) => {
                        if (err) {
                            console.log("Error inserting data:", err.message);
                            return res.status(500).send("Internal Server Error");
                        }
                    });
                }
            }
            // Render the home page after all inserts are done
            res.render("home.ejs", { loggedIn: true, role: "club", email: email });
        });
    });
});

app.post('/comparing', (req, res) => {
    // Assuming you're receiving the rejection reason as JSON data in the request body
    const rejectionReason = req.body.reason;
    console.log('incoming req body:', req.body);

    // Insert the rejection reason into the database
    const sql = 'INSERT INTO history_event (comment) VALUES (?)';
    console.log('SQL query:', sql);
    connection.query(sql, [rejectionReason], (err, result) => {
        if (err) {
            console.error('Error inserting rejection reason:', err);
            res.status(500).send('Error inserting rejection reason');
            return;
        }
        console.log('Rejection reason inserted successfully');
        res.status(200).send('Rejection reason inserted successfully');
    });
});

app.get("/notifications", (req, res) => {
    const email = req.session.email;
    connection.query("SELECT club_id from club_manager where email = ?", [email], (err, result) => {
        if (err) {
            console.error("Error fetching club id:", err);
            return res.status(500).send("Internal Server Error");
        }
        let clubID = result[0].club_id;

        connection.query(`SELECT event_name, status, comment, event_id, notificationstatus FROM history_event WHERE club_id = ?`, [clubID], (err, resultsHistoryNot) => {
            if (err) {
                console.error("Error fetching temp events:", err);
                return res.status(500).send("Internal Server Error");
            } else {
                res.render("notifications.ejs", { loggedIn: true, role: "club", email: email, resultsHistoryNot });
            }
        });
    });
});

app.post("/changeNotificationStatus", (req, res) => {
    console.log("form has been sent");
    const email = req.session.email;
    const eventId = req.query.eventId;
    console.log("form has been sent " + eventId);
    connection.query("UPDATE history_event SET notificationstatus = 1 WHERE event_id = ?", [eventId], (err) => {
        if (err) {
            console.log("can't update the notifiction status")
        } else {
            console.log("The status has been updated");

            connection.query("SELECT club_id from club_manager where email = ?", [email], (err, result) => {
                if (err) {
                    console.error("Error fetching club id:", err);
                    return res.status(500).send("Internal Server Error");
                }
                let clubID = result[0].club_id;

                connection.query(`SELECT event_name, status, comment, event_id, notificationstatus FROM history_event WHERE club_id = ?`, [clubID], (err, resultsHistoryNot) => {
                    if (err) {
                        console.error("Error fetching temp events:", err);
                        return res.status(500).send("Internal Server Error");
                    } else {
                        res.render("notifications.ejs", { loggedIn: true, role: "club", email: email, resultsHistoryNot });
                    }
                });
            });
        }
    });
});




//listining to the port 
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});