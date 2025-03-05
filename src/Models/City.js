import mongoose from 'mongoose';

const { Schema } = mongoose;

const citySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    website: {
        type: String,
        required: false
    },
    cityId: {
        type: Number,
        required: false
    }
}, {
    timestamps: true,
    versionKey: false
});

const City = mongoose.model('City', citySchema);

export default City;
