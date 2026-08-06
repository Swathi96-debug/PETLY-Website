import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, PawPrint, DollarSign, Heart, TrendingUp, AlertTriangle } from 'lucide-react';
import './AdminPanel.css';

const revenueData = [
  { month: 'Jan', revenue: 12000 },
  { month: 'Feb', revenue: 15000 },
  { month: 'Mar', revenue: 13500 },
  { month: 'Apr', revenue: 18000 },
  { month: 'May', revenue: 22000 },
  { month: 'Jun', revenue: 25000 },
];

const adoptionData = [
  { name: 'Dogs', value: 400 },
  { name: 'Cats', value: 300 },
  { name: 'Others', value: 200 },
];

const COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];

const AdminPanel = () => {
  return (
    <div className="admin-page animate-fade">
      <div className="container">
        <header className="admin-header">
          <h1>Admin <span className="text-highlight">Control Center</span></h1>
          <div className="admin-badge">Secure Access</div>
        </header>

        {/* Global Stats */}
        <div className="admin-stats-grid">
          <div className="stat-box glass-card">
            <Users size={24} />
            <div>
              <h3>24,800</h3>
              <p>Total Users</p>
            </div>
            <div className="trend positive">+12%</div>
          </div>
          <div className="stat-box glass-card">
            <PawPrint size={24} />
            <div>
              <h3>1,420</h3>
              <p>Active Adoptions</p>
            </div>
            <div className="trend positive">+5%</div>
          </div>
          <div className="stat-box glass-card">
            <DollarSign size={24} />
            <div>
              <h3>$142,500</h3>
              <p>Monthly Revenue</p>
            </div>
            <div className="trend positive">+24%</div>
          </div>
          <div className="stat-box glass-card">
            <Heart size={24} />
            <div>
              <h3>98%</h3>
              <p>Pet Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="admin-charts-grid">
          <div className="chart-container glass-card">
            <h3>Revenue Growth</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-container glass-card">
            <h3>Adoption Distribution</h3>
            <div className="chart-wrapper flex-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={adoptionData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {adoptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {adoptionData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <span style={{background: COLORS[i]}}></span> {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Management Table */}
        <div className="management-section glass-card">
          <div className="ms-header">
            <h3>Recent Appointments</h3>
            <button className="btn-text">View All</button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Pet</th>
                <th>Service</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>James Wilson</td>
                <td>Cooper</td>
                <td>Vet Checkup</td>
                <td><span className="status-badge pending">Pending</span></td>
                <td>Jun 25, 2026</td>
              </tr>
              <tr>
                <td>Lydia Chen</td>
                <td>Mochi</td>
                <td>Grooming</td>
                <td><span className="status-badge completed">Completed</span></td>
                <td>Jun 24, 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
