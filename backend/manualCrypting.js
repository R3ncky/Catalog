import bcrypt from 'bcrypt';

const password = 'Neznam123';
const saltRound = 10;

// bcrypt.hash(password, saltRound).then(hash => {
//     console.log('Hashed: ', hash);
// })

bcrypt.compare('Neznam123', '$2b$10$65oaj1dGagYC72E550k7KeiML6gYboI66xefQhSjdgpGSOVgd2yfK').then(result => console.log(result));