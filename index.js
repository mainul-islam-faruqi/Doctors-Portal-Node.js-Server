const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb')
require('dotenv').config()

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fgaci.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;


const app = express()

app.use(bodyParser.json())
app.use(cors());
app.use(express.static('doctors'));
app.use(fileUpload());

const port = 5000

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const appointmentCollection = client.db("doctorsPortal").collection("appointments");
  const doctorCollection = client.db("doctorsPortal").collection("doctors");
  const patientCollection = client.db("doctorsPortal").collection("patients");

  app.post('/addAppointment', (req, res) => {
    const appointment = req.body;
    appointmentCollection.insertOne(appointment)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  })

  app.post('/appointmentsByDate', (req, res) => {
    const date = req.body.date;
    const email = req.body.email;

    doctorCollection.find({ email: email })
      .toArray((err, doctors) => {
        const filter = { date: date }
        if (doctors.length === 0) {
          filter.email = email;
        }

        appointmentCollection.find(filter)
          .toArray((err, documents) => {
            res.send(documents)
          })

      })
  })

  app.post('/get-todays-appointment', (req, res) => {
    const date = req.body.date;
    appointmentCollection.find({ date: date })
      .toArray((err, documents) => {
        res.send(documents)
      })
  })

  app.patch('/update-status', (req, res) => {
    appointmentCollection.updateOne(
      { _id: ObjectId(req.body.id) },
      { $set: { 'action': req.body.action } }
    )
      .then(result => {
        res.send(result.modifiedCount > 0)
      })
      .catch(err => console.log(err))
  })

  app.get('/get-all-appointment', (req, res) => {
    appointmentCollection.find({})
      .toArray((err, documents) => {
        res.send(documents)
      })
  })



  app.post('/addDoctor', (req, res) => {
    const file = req.files.file;
    const name = req.body.name;
    const email = req.body.email;
    const filePath = `${__dirname}/doctors/${file.name}`;

    file.mv(filePath, err => {
      if (err) {
        console.log(err);
        res.status(500).send({ message: "Failed to upload Image" });

      }
      const newImg = fs.readFileSync(filePath);
      const encImg = newImg.toString('base64');

      var image = {
        contentType: req.files.file.mimeType,
        size: req.files.file.size,
        img: Buffer(encImg, 'base64')
      }

      doctorCollection.insertOne({ name, email, image })
        .then(result => {
          fs.remove(filePath, error => {
            if (error) {
              console.log(error);
              res.status(500).send({ message: "Failed to upload Image" });
            }
            res.send(result.insertedCount > 0)
          })

        })

      return res.send({ name: file.name, path: `/${file.name}` })
    })



  })


  app.get('/doctors', (req, res) => {
    doctorCollection.find({})
      .toArray((err, documents) => {
        res.send(documents);
      })
  })


  app.post('/isDoctor', (req, res) => {
    const email = req.body.email;
    doctorCollection.find({ email: email })
      .toArray((err, doctors) => {
        res.send(doctors.length > 0);
      })
  })


  app.post('/addPatient', (req, res) => {
    const loggedInUser = req.body.loggedInUser;
    const name = loggedInUser.name;
    const email = loggedInUser.email;
    doctorCollection.find({ email: email })
      .toArray((err, doctor) => {
        if (doctor.length === 0) {
          patientCollection.find({ email: email })
            .toArray((err, patient) => {
              if (patient.length === 0) {
                patientCollection.insertOne({name, email})
                .then(result => {
                  res.send(result.insertedCount > 0)
                })
              }
            })

        }
      })

  })

  app.get('/all-patient',(req,res)=>{
    patientCollection.find({})
    .toArray((err,patients)=>{
      res.send(patients)
    })
  })






});


app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})