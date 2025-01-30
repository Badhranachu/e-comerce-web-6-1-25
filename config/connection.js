const mongoose = require('mongoose');

module.exports.connect = async function (done) {
    const url = 'mongodb://127.0.0.1:27017/shopping';

    try {
        await mongoose.connect(url, {serverSelectionTimeoutMS: 10000});
        console.log('Database connected successfully');
        done();
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        done(err);
    }
};

module.exports.get = function () {
    return mongoose.connection;
};
