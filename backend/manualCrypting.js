import bcrypt from 'bcrypt';

const password = 'adminpass';
const saltRound = 10;

// bcrypt.hash(password, saltRound).then(hash => {
//     console.log('Hashed: ', hash);
// })

bcrypt.compare('adminpass', '$2b$10$aIsssiFQI31uedRLIhi4QOSG07edqV69W4VJ6Eh0mRm7wqb2VqWiS').then(result => console.log(result));