import JobData from '../Models/JobData.js';
import mongoose from 'mongoose';
import Company from "../Models/Company.js";

const JobDataService = {
    // Create new job data (insert multiple records)
    create: async (data) => {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array');
        }

        try {
            const existingRecords = await JobData.find({
                redirectUrl: { $in: data.map(job => job.redirectUrl) }
            }).select('redirectUrl');

            if (existingRecords.length > 0) {
                const existingData = new Set(existingRecords.map(record => record.redirectUrl));
                data = data.filter(job => !existingData.has(job.redirectUrl));
            }

            if (data.length > 0) {
                const results = await JobData.insertMany(data);

                return {
                    status: 201,
                    message: `Insertion completed. Number of records inserted: ${results.length}`,
                    count: results.length,
                };
            } else {
                return {
                    status: 200,
                    message: 'No new records to insert. All provided records already exist in the database.',
                    count: 0,
                };
            }
        } catch (error) {
            throw new Error(`Error inserting records in JobData: ${error.message}`);
        }
    },
    removeDuplicates: async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const allJobs = await JobData.find({
                createdAt: { $gte: thirtyDaysAgo },
            }).sort({ createdAt: -1 });

            if (!allJobs || allJobs.length === 0) {
                return {
                    status: 200,
                    message: 'No data found for the last 30 days.',
                    count: 0,
                };
            }

            const seenUniqueKeys = new Map();
            const duplicateIds = [];

            allJobs.forEach(job => {
                const uniqueKey = job.uniqueKey;
                if (seenUniqueKeys.has(uniqueKey)) {
                    const previousJob = seenUniqueKeys.get(uniqueKey);
                    duplicateIds.push(previousJob._id);
                    seenUniqueKeys.set(uniqueKey, job);
                } else {
                    seenUniqueKeys.set(uniqueKey, job);
                }
            });

            if (duplicateIds.length > 0) {
                await JobData.deleteMany({ _id: { $in: duplicateIds } });
                return {
                    status: 201,
                    message: `Deleted ${duplicateIds.length} duplicate records from the last 30 days.`,
                    count: duplicateIds.length,
                };
            } else {
                return {
                    status: 200,
                    message: 'No duplicate data found for the last 30 days.',
                    count: 0,
                };
            }
        } catch (error) {
            return {
                status: 500,
                message: 'An error occurred during the process.',
                error: error.message,
            };
        }
    },

    getAllJobs: async (data) => {
        try {
            const filteredJobs = [];
            const seenUrls = new Set();

            const currentDate = new Date();
            const thirtyDaysAgo = new Date(currentDate.setDate(currentDate.getDate() - 30));

            const query = {
                createdAt: { $gte: thirtyDaysAgo },
                isActive: true
            };

            // if (data.categoryId && !isNaN(Number(data.categoryId))) {
            //     query.$or = [
            //         { categoryId: +data.categoryId },
            //         { subCategoryId: +data.categoryId }
            //     ];
            // }

            if (data.categoryId && !isNaN(Number(data.categoryId))) query.categoryId = +data.categoryId;
            if (data.cityId && !isNaN(Number(data.cityId))) query.cityId = +data.cityId;
            if (data.educationId && !isNaN(Number(data.educationId))) query.educationId = +data.educationId;
            if (data.experience && !isNaN(Number(data.experience))) query.experienceId = +data.experience;
            if (data.jobType) query.jobType = data.jobType;
            if (!data.allJobs) query.sourceUrl = 'jobing.az';
            if (data.minSalary && !isNaN(Number(data.minSalary)) && data.minSalary !== 0) query.minSalary = { $gte: +data.minSalary };
            if (data.maxSalary && !isNaN(Number(data.maxSalary))) query.maxSalary = { $lte: +data.maxSalary };

            if (data.keyword) {
                query.$or = [
                    { title: { $regex: data.keyword, $options: 'i' } },
                    { companyName: { $regex: data.keyword, $options: 'i' } },
                    { location: { $regex: data.keyword, $options: 'i' } }
                ];
            }

            const limit = 100;
            const offset = Number(data.offset) || 0;
            // console.log({data,query});

            const jobs = await JobData.find(query)
                .sort({ createdAt: -1 })
                .populate('companyDetails', 'imageUrl companyName')
                .skip(offset)
                .limit(limit);

            const totalCount = await JobData.countDocuments(query);

            const jobsWithImageUrl = jobs.map(job => ({
                ...job.toObject(),
                companyImageUrl: job.companyDetails?.imageUrl || null

            }));

            jobsWithImageUrl.forEach(job => {
                if (!seenUrls.has(job.redirectUrl)) {
                    seenUrls.add(job.redirectUrl);
                    filteredJobs.push(job);
                }
            });

            return {
                totalCount: totalCount,
                jobs: filteredJobs,
                hideLoadMore: (limit + offset >= totalCount)
            };
        } catch (error) {
            throw new Error('Error retrieving jobs: ' + error.message);
        }
    },

    // Find a job by ID
    findSiteById: async (id) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Invalid job ID format');
            }

            // findById() retrieves a document by its ID
            const job = await JobData.findById(id);
            if (!job) {
                throw new Error('Job not found');
            }
            return job;
        } catch (error) {
            throw new Error('Error retrieving job: ' + error.message);
        }
    },

    // Update job data
    updateJob: async (id, status) => {
        try {
            if (!id) {
                throw new Error('ID is required');
            }
    
            const updateData = {
                isActive: status,
                updatedAt: new Date(),
                redirectUrl: `https://jobing.az/jobs/${id}/details`,
            };
    
            const job = await JobData.findByIdAndUpdate(id, updateData, { new: true });
    
            if (!job) {
                throw new Error('Job not found');
            }
    
            return 'Job updated';
        } catch (error) {
            console.error('Error updating job:', error); // Konsola detaylı hata yazdır
            throw error; // Orijinal hatayı yeniden fırlat
        }
    },
    

    // Delete job data
    deleteSite: async (id) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Invalid job ID format');
            }

            // findByIdAndDelete() deletes a document by its ID
            const job = await JobData.findByIdAndDelete(id);
            if (!job) {
                throw new Error('Job not found');
            }
            return { message: 'Job successfully deleted' };
        } catch (error) {
            throw new Error('Error deleting job: ' + error.message);
        }
    },

    addJobRequest: async (data) => {
        try {
            const job = new JobData(data);
            const savedJob = await job.save();
            savedJob.uniqueKey = savedJob._id.toString();
            await savedJob.save();
            return { status: 200, message: 'Məlumat uğurla əlavə edildi!', "id": savedJob._id };
        } catch (error) {
            throw new Error('Error adding job request: ' + error.message);
        }
    },

    // Job details
    details: async (id) => {
        try {
            const job = await JobData.aggregate([
                {
                    $match: { uniqueKey: id }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'categoryId',
                        foreignField: 'localCategoryId',
                        as: 'category'
                    }
                },
                {
                    $addFields: {
                        category: { $arrayElemAt: ['$category.categoryName', 0] },
                    }
                },
                {
                    $project: {
                        uniqueKey: 1,
                        title: 1,
                        email: 1,
                        phone: 1,
                        description: 1,
                        location: 1,
                        minSalary: 1,
                        maxSalary: 1,
                        minAge: 1,
                        maxAge: 1,
                        companyName: 1,
                        cityId: 1,
                        educationId: 1,
                        experienceId: 1,
                        userName: 1,
                        isPremium: 1,
                        isActive: 1,
                        sourceUrl: 1,
                        redirectUrl: 1,
                        postedAt: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        category: 1,
                    }
                }
            ]);
    
            if (!job || job.length === 0) {
                throw new Error('Job not found');
            }
    
            const company = await Company.findOne({ companyName: String(job[0].companyName) });
    
            if (company && company.imageUrl) {
                let imageUrl = company.imageUrl;
                let index = imageUrl.indexOf('src/Public'); 
    
                if (index !== -1) {
                    job[0].companyImage = imageUrl.slice(index + 10);
                } else {
                    job[0].companyImage = imageUrl;
                }
            } else {
                job[0].companyImage = null; 
            }
    
            return job[0];
        } catch (error) {
            console.error('Error fetching job:', error); // Hata detaylarını konsola yaz
            throw error; // Orijinal hatayı fırlat
        }
    },
    

    count: async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return JobData.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });
    }
};

export default JobDataService;
