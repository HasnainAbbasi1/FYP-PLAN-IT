// Mock data for development and testing
// This file provides fallback data when VITE_USE_MOCK_DATA=true
// By default, the application now uses real backend APIs
// Keep this file for development/testing purposes only
import { useAuth } from '../contexts/AuthContext';

// Mock Projects Data
export const mockProjects = [
  {
    id: 1,
    title: "Downtown Revitalization",
    description: "Urban renewal project focusing on mixed-use development and pedestrian-friendly spaces",
    location: "Central District",
    type: "Mixed-Use Development",
    status: "In Progress",
    priority: "High",
    progress: 65,
    budget: 2500000,
    startDate: "2024-05-15",
    endDate: "2025-12-15",
    createdAt: "2024-05-01T10:00:00Z",
    updatedAt: "2024-10-01T14:30:00Z",
    tags: ["sustainable", "mixed-use", "downtown"],
    teamMembers: [
      { id: 1, name: "John Smith", avatar: null },
      { id: 2, name: "Sarah Johnson", avatar: null },
      { id: 3, name: "Mike Chen", avatar: null }
    ],
    objectives: [
      "Create pedestrian-friendly spaces",
      "Integrate sustainable design principles",
      "Boost local economic activity"
    ],
    area: 12.5,
    createdBy: 1,
    user_id: 1
  },
  {
    id: 2,
    title: "Riverside Development",
    description: "Waterfront project with recreational spaces and sustainable housing units",
    location: "East Riverbank",
    type: "Residential Development",
    status: "Planning",
    priority: "Medium",
    progress: 25,
    budget: 1800000,
    startDate: "2024-06-22",
    endDate: "2025-08-30",
    createdAt: "2024-06-01T09:15:00Z",
    updatedAt: "2024-09-15T11:45:00Z",
    tags: ["waterfront", "residential", "recreation"],
    teamMembers: [
      { id: 1, name: "John Smith", avatar: null },
      { id: 4, name: "Emily Davis", avatar: null }
    ],
    objectives: [
      "Develop sustainable housing units",
      "Create recreational waterfront spaces",
      "Preserve natural habitat"
    ],
    area: 8.3,
    createdBy: 1,
    user_id: 1
  },
  {
    id: 3,
    title: "Green Transit Corridor",
    description: "Sustainable transportation project connecting residential zones with the business district",
    location: "North-South Axis",
    type: "Transportation",
    status: "Completed",
    priority: "High",
    progress: 100,
    budget: 3200000,
    startDate: "2024-01-10",
    endDate: "2024-09-30",
    createdAt: "2023-12-15T14:20:00Z",
    updatedAt: "2024-09-30T16:00:00Z",
    tags: ["transit", "sustainable", "connectivity"],
    teamMembers: [
      { id: 2, name: "Sarah Johnson", avatar: null },
      { id: 5, name: "David Wilson", avatar: null },
      { id: 6, name: "Lisa Park", avatar: null }
    ],
    objectives: [
      "Connect residential and business districts",
      "Reduce carbon emissions",
      "Improve public transportation"
    ],
    area: 15.7,
    createdBy: 2,
    user_id: 2
  },
  {
    id: 4,
    title: "Smart Industrial Park",
    description: "Modern industrial zone with integrated technology and environmental considerations",
    location: "West Industrial Zone",
    type: "Industrial Zone",
    status: "On Hold",
    priority: "Low",
    progress: 10,
    budget: 4500000,
    startDate: "2024-08-05",
    endDate: "2026-03-15",
    createdAt: "2024-07-20T13:30:00Z",
    updatedAt: "2024-09-10T10:15:00Z",
    tags: ["industrial", "smart", "technology"],
    teamMembers: [
      { id: 3, name: "Mike Chen", avatar: null }
    ],
    objectives: [
      "Integrate smart technology systems",
      "Minimize environmental impact",
      "Create modern industrial facilities"
    ],
    area: 25.0,
    createdBy: 3,
    user_id: 3
  },
  {
    id: 5,
    title: "Community Health Center",
    description: "New healthcare facility serving the growing suburban population",
    location: "Suburban District",
    type: "Community Facilities",
    status: "In Progress",
    priority: "Critical",
    progress: 45,
    budget: 1200000,
    startDate: "2024-04-01",
    endDate: "2025-02-28",
    createdAt: "2024-03-15T11:00:00Z",
    updatedAt: "2024-09-25T15:20:00Z",
    tags: ["healthcare", "community", "suburban"],
    teamMembers: [
      { id: 4, name: "Emily Davis", avatar: null },
      { id: 5, name: "David Wilson", avatar: null }
    ],
    objectives: [
      "Provide accessible healthcare services",
      "Serve growing suburban population",
      "Integrate modern medical technology"
    ],
    area: 3.2,
    createdBy: 4,
    user_id: 4
  }
];

// Mock Dashboard Stats
export const mockDashboardStats = {
  totalProjects: mockProjects.length,
  inProgress: mockProjects.filter(p => p.status === 'In Progress').length,
  completed: mockProjects.filter(p => p.status === 'Completed').length,
  planning: mockProjects.filter(p => p.status === 'Planning').length,
  onHold: mockProjects.filter(p => p.status === 'On Hold').length,
  totalArea: mockProjects.reduce((sum, p) => sum + p.area, 0),
  totalBudget: mockProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
  averageProgress: mockProjects.reduce((sum, p) => sum + p.progress, 0) / mockProjects.length
};

// Mock Recent Activities
export const mockRecentActivities = [
  {
    id: 1,
    type: 'project_created',
    message: 'Created new project "Community Health Center"',
    timestamp: '2024-10-01T14:30:00Z',
    user: 'Emily Davis',
    projectId: 5
  },
  {
    id: 2,
    type: 'project_updated',
    message: 'Updated progress on "Downtown Revitalization" to 65%',
    timestamp: '2024-10-01T12:15:00Z',
    user: 'John Smith',
    projectId: 1
  },
  {
    id: 3,
    type: 'project_completed',
    message: 'Completed project "Green Transit Corridor"',
    timestamp: '2024-09-30T16:00:00Z',
    user: 'Sarah Johnson',
    projectId: 3
  },
  {
    id: 4,
    type: 'project_status_changed',
    message: 'Changed status of "Smart Industrial Park" to On Hold',
    timestamp: '2024-09-10T10:15:00Z',
    user: 'Mike Chen',
    projectId: 4
  },
  {
    id: 5,
    type: 'team_member_added',
    message: 'Added Lisa Park to "Green Transit Corridor" team',
    timestamp: '2024-09-05T09:45:00Z',
    user: 'Sarah Johnson',
    projectId: 3
  }
];

// Mock API functions that simulate backend calls
export const mockProjectApi = {
  getAllProjects: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockProjects;
  },

  getUserProjects: async (userId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    // Filter projects by user ID
    const userProjects = mockProjects.filter(project => 
      project.createdBy === parseInt(userId) || project.user_id === parseInt(userId)
    );
    return userProjects;
  },

  getProject: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const project = mockProjects.find(p => p.id === parseInt(id));
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  },

  createProject: async (projectData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newProject = {
      ...projectData,
      id: Math.max(...mockProjects.map(p => p.id)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      area: 0,
      teamMembers: projectData.teamMembers || []
    };
    mockProjects.unshift(newProject);
    return newProject;
  },

  updateProject: async (id, projectData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockProjects.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Project not found');
    }
    mockProjects[index] = {
      ...mockProjects[index],
      ...projectData,
      updatedAt: new Date().toISOString()
    };
    return mockProjects[index];
  },

  deleteProject: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockProjects.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Project not found');
    }
    mockProjects.splice(index, 1);
    return { success: true };
  },

  getProjectStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      ...mockDashboardStats,
      // Recalculate stats based on current mockProjects
      totalProjects: mockProjects.length,
      inProgress: mockProjects.filter(p => p.status === 'In Progress').length,
      completed: mockProjects.filter(p => p.status === 'Completed').length,
      planning: mockProjects.filter(p => p.status === 'Planning').length,
      onHold: mockProjects.filter(p => p.status === 'On Hold').length,
      totalArea: mockProjects.reduce((sum, p) => sum + p.area, 0),
      totalBudget: mockProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
      averageProgress: mockProjects.length > 0 
        ? mockProjects.reduce((sum, p) => sum + p.progress, 0) / mockProjects.length 
        : 0
    };
  },

  updateProjectStatus: async (id, status) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockProjects.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Project not found');
    }
    mockProjects[index] = {
      ...mockProjects[index],
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Add activity
    mockRecentActivities.unshift({
      id: Date.now(),
      type: 'project_status_changed',
      message: `Changed status of "${mockProjects[index].title}" to ${status}`,
      timestamp: new Date().toISOString(),
      user: 'Current User',
      projectId: id
    });
    
    return mockProjects[index];
  }
};

export const mockDashboardApi = {
  getDashboardStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockProjectApi.getProjectStats();
  },

  getRecentActivities: async (limit = 10) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockRecentActivities.slice(0, limit);
  },

  getProjectProgress: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockProjects.map(project => ({
      id: project.id,
      title: project.title,
      progress: project.progress,
      status: project.status,
      dueDate: project.endDate
    }));
  }
};
