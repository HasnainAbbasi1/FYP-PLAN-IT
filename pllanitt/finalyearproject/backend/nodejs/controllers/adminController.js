const { User, Project, Polygon, TerrainAnalysis, LandSuitability, ZoningResult, OptimizationZoning } = require('../models/associations');
const { Op, fn, col } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');
const DAY_IN_MS = 24 * 60 * 60 * 1000;

class AdminController {
    /**
     * Get all users with pagination and filtering
     */
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows: users } = await User.findAndCountAll({
                where: whereClause,
                attributes: { exclude: ['password'] }, // Exclude password from response
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: Project,
                        as: 'createdProjects',
                        attributes: ['id', 'title', 'created_at'],
                        required: false
                    }
                ]
            });

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users',
                details: error.message
            });
        }
    }

    /**
     * Create a new user (admin action)
     */
    async createUser(req, res) {
        try {
            const { name, email, password, role = 'viewer', isActive = true, phone, bio } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Name, email and password are required'
                });
            }

            const validRoles = ['admin', 'planner', 'viewer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role specified'
                });
            }

            const existingUser = await User.findOne({
                where: { email: email.toLowerCase().trim() }
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'A user with this email already exists'
                });
            }

            // Normalize optional fields to avoid validation errors (e.g. empty string phone)
            const normalizedPhone = phone && phone.trim() !== '' ? phone.trim() : null;
            const normalizedBio = bio && bio.trim() !== '' ? bio.trim() : null;

            const newUser = await User.create({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
                role,
                isActive,
                phone: normalizedPhone,
                bio: normalizedBio
            });

            res.status(201).json({
                success: true,
                data: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    isActive: newUser.isActive,
                    phone: newUser.phone,
                    bio: newUser.bio,
                    createdAt: newUser.createdAt
                },
                message: 'User created successfully'
            });
        } catch (error) {
            console.error('Error creating user:', error);

            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.errors.map(err => ({
                        field: err.path,
                        message: err.message
                    }))
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to create user',
                details: error.message
            });
        }
    }

    /**
     * Get user by ID with detailed information
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id, {
                attributes: { exclude: ['password'] },
                include: [
                    {
                        model: Project,
                        as: 'createdProjects',
                        include: [
                            {
                                model: Polygon,
                                as: 'polygons',
                                attributes: ['id', 'name', 'created_at']
                            }
                        ]
                    }
                ]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get user statistics
            const userStats = await this.getUserStatistics(id);

            res.json({
                success: true,
                data: {
                    user,
                    statistics: userStats
                }
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user',
                details: error.message
            });
        }
    }

    /**
     * Update user information
     */
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role, isActive, phone, bio } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Prevent admin from changing their own role
            if (req.user.id === parseInt(id) && role && role !== user.role) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot change your own role'
                });
            }

            await user.update({
                name: name || user.name,
                email: email || user.email,
                role: role || user.role,
                isActive: isActive !== undefined ? isActive : user.isActive,
                phone: phone || user.phone,
                bio: bio || user.bio
            });

            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update user',
                details: error.message
            });
        }
    }

    /**
     * Delete user and all associated data
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Prevent admin from deleting themselves
            if (req.user.id === parseInt(id)) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot delete your own account'
                });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Delete user's projects and associated data
            const projects = await Project.findAll({ where: { created_by: id } });
            for (const project of projects) {
                await this.deleteProjectData(project.id);
            }

            // Delete user
            await user.destroy();

            res.json({
                success: true,
                message: 'User and all associated data deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete user',
                details: error.message
            });
        }
    }

    /**
     * Get all projects with pagination and filtering
     */
    async getAllProjects(req, res) {
        try {
            const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            if (search) {
                whereClause[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows: projects } = await Project.findAndCountAll({
                where: whereClause,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Polygon,
                        as: 'polygons',
                        attributes: ['id', 'title', 'created_at'],
                        required: false
                    }
                ]
            });

            res.json({
                success: true,
                data: {
                    projects,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch projects',
                details: error.message
            });
        }
    }

    /**
     * Get project by ID with detailed information
     */
    async getProjectById(req, res) {
        try {
            const { id } = req.params;

            const project = await Project.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Polygon,
                        as: 'polygons',
                        include: [
                            {
                                model: TerrainAnalysis,
                                as: 'terrainAnalysis',
                                required: false
                            },
                            {
                                model: LandSuitability,
                                as: 'landSuitability',
                                required: false
                            }
                        ]
                    }
                ]
            });

            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }

            res.json({
                success: true,
                data: project
            });
        } catch (error) {
            console.error('Error fetching project:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch project',
                details: error.message
            });
        }
    }

    /**
     * Delete project and all associated data
     */
    async deleteProject(req, res) {
        try {
            const { id } = req.params;

            const project = await Project.findByPk(id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found'
                });
            }

            await this.deleteProjectData(id);

            res.json({
                success: true,
                message: 'Project and all associated data deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete project',
                details: error.message
            });
        }
    }

    /**
     * Get projects for a specific user
     */
    async getUserProjects(req, res) {
        try {
            const { id } = req.params;

            const projects = await Project.findAll({
                where: { created_by: id },
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: Polygon,
                        as: 'polygons',
                        attributes: ['id', 'title', 'created_at'],
                        required: false
                    }
                ]
            });

            res.json({
                success: true,
                data: projects
            });
        } catch (error) {
            console.error('Error fetching user projects:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user projects',
                details: error.message
            });
        }
    }

    /**
     * Get project polygons
     */
    async getProjectPolygons(req, res) {
        try {
            const { id } = req.params;

            const polygons = await Polygon.findAll({
                where: { project_id: id },
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: TerrainAnalysis,
                        as: 'terrainAnalysis',
                        required: false
                    },
                    {
                        model: LandSuitability,
                        as: 'landSuitability',
                        required: false
                    }
                ]
            });

            res.json({
                success: true,
                data: polygons
            });
        } catch (error) {
            console.error('Error fetching project polygons:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch project polygons',
                details: error.message
            });
        }
    }

    /**
     * Get admin statistics
     */
    async getAdminStats(req, res) {
        try {
            const totalUsers = await User.count();
            const activeUsers = await User.count({ where: { isActive: true } });
            const totalProjects = await Project.count();
            const totalPolygons = await Polygon.count();
            const totalAnalyses = await TerrainAnalysis.count();

            // Recent activity (last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentUsers = await User.count({
                where: { created_at: { [Op.gte]: sevenDaysAgo } }
            });
            const recentProjects = await Project.count({
                where: { created_at: { [Op.gte]: sevenDaysAgo } }
            });

            res.json({
                success: true,
                data: {
                    totalUsers,
                    activeUsers,
                    totalProjects,
                    totalPolygons,
                    totalAnalyses,
                    recentActivity: {
                        newUsers: recentUsers,
                        newProjects: recentProjects
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch admin statistics',
                details: error.message
            });
        }
    }

    /**
     * Get detailed user analytics for admin insights
     */
    async getUserAnalytics(req, res) {
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_IN_MS);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);

            const growthTrendPromise = getUserGrowthTrend();
            const topContributorsPromise = getTopContributors();

            const [
                totalUsers,
                activeUsers,
                totalProjects,
                totalPolygons,
                totalAnalyses,
                newUsersThisMonth,
                activeThisWeek,
                totalLogins,
                roleDistributionRaw,
                recentUsers,
                analysesLast30Days,
                growthTrend,
                topContributors
            ] = await Promise.all([
                User.count(),
                User.count({ where: { isActive: true } }),
                Project.count(),
                Polygon.count(),
                TerrainAnalysis.count(),
                User.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } } }),
                User.count({ where: { lastLogin: { [Op.gte]: sevenDaysAgo } } }),
                User.count({ where: { lastLogin: { [Op.not]: null } } }),
                User.findAll({
                    attributes: ['role', [fn('COUNT', col('role')), 'count']],
                    group: ['role']
                }),
                User.findAll({
                    attributes: ['id', 'name', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
                    order: [
                        ['lastLogin', 'DESC'],
                        ['created_at', 'DESC']
                    ],
                    limit: 8
                }),
                TerrainAnalysis.count({
                    where: { created_at: { [Op.gte]: thirtyDaysAgo } }
                }).catch(() => 0),
                growthTrendPromise,
                topContributorsPromise
            ]);

            const averageSessionMinutes = activeThisWeek > 0
                ? Math.round(Math.max(6, (analysesLast30Days / activeThisWeek) * 12))
                : 0;

            const roleDistribution = roleDistributionRaw.map((row) => ({
                role: row.role,
                count: parseInt(row.get('count'), 10)
            }));

            const recentActivity = recentUsers.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }));

            const overview = {
                totalUsers,
                activeUsers,
                avgSessionMinutes: averageSessionMinutes,
                totalLogins,
                activeThisWeek,
                newUsersThisMonth
            };

            const insights = {
                avgProjectsPerUser: totalUsers ? Number((totalProjects / totalUsers).toFixed(1)) : 0,
                avgPolygonsPerUser: totalUsers ? Number((totalPolygons / totalUsers).toFixed(1)) : 0,
                analysesCompleted: totalAnalyses,
                engagementRate: totalUsers ? Number(((activeUsers / totalUsers) * 100).toFixed(1)) : 0,
                retentionRate: totalUsers ? Number(((totalLogins / totalUsers) * 100).toFixed(1)) : 0
            };

            res.json({
                success: true,
                data: {
                    overview,
                    roleDistribution,
                    statusDistribution: {
                        active: activeUsers,
                        inactive: Math.max(totalUsers - activeUsers, 0)
                    },
                    insights,
                    recentActivity,
                    growthTrend,
                    topContributors
                }
            });
        } catch (error) {
            console.error('Error fetching user analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user analytics',
                details: error.message
            });
        }
    }

    /**
     * Get user statistics
     */
    async getUserStatistics(userId) {
        try {
            const totalProjects = await Project.count({ where: { created_by: userId } });
            const totalPolygons = await Polygon.count({ where: { user_id: userId } });
            const totalAnalyses = await TerrainAnalysis.count({
                include: [{
                    model: Polygon,
                    as: 'polygon',
                    where: { user_id: userId }
                }]
            });

            return {
                totalProjects,
                totalPolygons,
                totalAnalyses
            };
        } catch (error) {
            console.error('Error fetching user statistics:', error);
            return {
                totalProjects: 0,
                totalPolygons: 0,
                totalAnalyses: 0
            };
        }
    }

    /**
     * Delete all project-related data
     */
    async deleteProjectData(projectId) {
        try {
            // Delete optimization zoning data
            await OptimizationZoning.destroy({ where: { projectId } });

            // Delete zoning results
            await ZoningResult.destroy({
                include: [{
                    model: Polygon,
                    as: 'polygon',
                    where: { project_id: projectId }
                }]
            });

            // Delete land suitability data
            await LandSuitability.destroy({
                include: [{
                    model: Polygon,
                    as: 'polygon',
                    where: { project_id: projectId }
                }]
            });

            // Delete terrain analysis data
            await TerrainAnalysis.destroy({
                include: [{
                    model: Polygon,
                    as: 'polygon',
                    where: { project_id: projectId }
                }]
            });

            // Delete polygons
            const polygons = await Polygon.findAll({ where: { project_id: projectId } });
            for (const polygon of polygons) {
                // Delete polygon files
                if (polygon.dem_url) {
                    try {
                        await fs.unlink(path.join(__dirname, '..', polygon.dem_url));
                    } catch (err) {
                        console.warn('Could not delete polygon file:', polygon.dem_url);
                    }
                }
            }
            await Polygon.destroy({ where: { project_id: projectId } });

            // Delete project
            await Project.destroy({ where: { id: projectId } });
        } catch (error) {
            console.error('Error deleting project data:', error);
            throw error;
        }
    }

    /**
     * Get system health information
     */
    async getSystemHealth(req, res) {
        try {
            const dbStatus = await this.checkDatabaseHealth();
            const diskSpace = await this.checkDiskSpace();
            const memoryUsage = process.memoryUsage();

            res.json({
                success: true,
                data: {
                    database: dbStatus,
                    diskSpace,
                    memory: {
                        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                        external: Math.round(memoryUsage.external / 1024 / 1024)
                    },
                    uptime: process.uptime()
                }
            });
        } catch (error) {
            console.error('Error checking system health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check system health',
                details: error.message
            });
        }
    }

    /**
     * Check database health
     */
    async checkDatabaseHealth() {
        try {
            await User.findOne({ limit: 1 });
            return { status: 'healthy', message: 'Database connection successful' };
        } catch (error) {
            return { status: 'unhealthy', message: error.message };
        }
    }

    /**
     * Check disk space
     */
    async checkDiskSpace() {
        try {
            const stats = await fs.stat(process.cwd());
            return {
                available: 'Unknown', // Would need additional library for disk space
                used: 'Unknown'
            };
        } catch (error) {
            return { available: 'Unknown', used: 'Unknown' };
        }
    }
}

async function getUserGrowthTrend(months = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const users = await User.findAll({
        attributes: ['id', 'createdAt'],
        where: {
            created_at: {
                [Op.gte]: startDate
            }
        },
        order: [['created_at', 'ASC']]
    });

    const buckets = [];
    for (let i = months - 1; i >= 0; i--) {
        const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`;
        buckets.push({
            key,
            month: bucketDate.toLocaleDateString('en-US', { month: 'short' }),
            value: 0
        });
    }

    const bucketMap = buckets.reduce((acc, bucket) => {
        acc[bucket.key] = bucket;
        return acc;
    }, {});

    users.forEach((user) => {
        const createdAt = user.get('createdAt') || user.get('created_at');
        if (!createdAt) return;
        const createdDate = new Date(createdAt);
        const key = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
        if (bucketMap[key]) {
            bucketMap[key].value += 1;
        }
    });

    return buckets.map(({ month, value }) => ({ month, value }));
}

async function getTopContributors(limit = 5) {
    const contributors = await Project.findAll({
        attributes: [
            'created_by',
            [fn('COUNT', col('Project.id')), 'projectCount']
        ],
        include: [
            {
                model: User,
                as: 'creator',
                attributes: ['id', 'name', 'email', 'role']
            }
        ],
        group: ['Project.created_by', 'creator.id'],
        order: [[fn('COUNT', col('Project.id')), 'DESC']],
        limit
    });

    return contributors.map((entry) => ({
        userId: entry.created_by,
        name: entry.creator ? entry.creator.name : 'Unknown',
        email: entry.creator ? entry.creator.email : null,
        role: entry.creator ? entry.creator.role : null,
        projects: parseInt(entry.get('projectCount'), 10)
    }));
}

module.exports = new AdminController();
