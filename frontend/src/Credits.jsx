import React, { useState } from 'react';
import { Award, X, Github, Linkedin, Mail, Heart, Code, Users } from 'lucide-react';

export default function Credits() {
  const [showModal, setShowModal] = useState(false);

  const team = [
    {
      name: 'Anirudhan Adukkathayar',
      role: 'Full Stack Developer',
      description: 'Project Lead & Backend Development',
      github: 'https://github.com/rudhanster/',
      email: 'rudhanster@gmail.com'
    },

    {
      name: 'Dr. Chithra K',
      role: 'Database Architect',
      description: 'Database Development',
      github: 'https://github.com/rudhanster/',
      email: 'chithus80@gmail.com'
    },
  ];

  const technologies = [
    { name: 'React', icon: '⚛️' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'PostgreSQL', icon: '🐘' },
    { name: 'Express', icon: '🚂' },
    { name: 'Tailwind CSS', icon: '🎨' },
    { name: 'Axios', icon: '📡' }
  ];

  const acknowledgments = [
    'College Administration for their support',
    'Faculty members for valuable feedback',
    'Open source community for amazing tools',
    'All contributors to this project'
  ];

  return (
    <>
      {/* Credits Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg"
        title="View credits"
      >
        <Award size={18} />
        <span className="hidden sm:inline">Credits</span>
      </button>

      {/* Credits Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-full p-3">
                  <Award className="text-purple-600" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">DutyDesk Credits</h2>
                  <p className="text-sm text-gray-600">Meet the team & technologies</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Version & Description */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">DutyDesk v1.0</h3>
              <p className="text-gray-700 leading-relaxed">
                An intelligent exam duty management system designed to streamline faculty assignments,
                ensure fair distribution, and automate scheduling with smart conflict detection.
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                <Code size={16} />
                <span>Built with passion and modern web technologies</span>
              </div>
            </div>

            {/* Team Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Development Team</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.map((member, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-1">{member.name}</h4>
                    <p className="text-sm text-purple-600 font-semibold mb-2">{member.role}</p>
                    <p className="text-sm text-gray-600 mb-3">{member.description}</p>
                    <div className="flex gap-3">
                      {member.github && (
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-purple-600 transition"
                          title="GitHub"
                        >
                          <Github size={18} />
                        </a>
                      )}
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-purple-600 transition"
                          title="LinkedIn"
                        >
                          <Linkedin size={18} />
                        </a>
                      )}
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="text-gray-600 hover:text-purple-600 transition"
                          title="Email"
                        >
                          <Mail size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technologies Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Technologies Used</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {technologies.map((tech, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200 flex items-center gap-2"
                  >
                    <span className="text-2xl">{tech.icon}</span>
                    <span className="font-semibold text-gray-800">{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acknowledgments Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="text-red-500" size={24} />
                <h3 className="text-xl font-bold text-gray-800">Acknowledgments</h3>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <ul className="space-y-2">
                  {acknowledgments.map((ack, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500 mt-1">❤️</span>
                      <span>{ack}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4">
              <div className="text-center text-sm text-gray-600">
                <p className="mb-2">© 2025 DutyDesk. All rights reserved.</p>
                <p className="flex items-center justify-center gap-1">
                  Made with <Heart size={14} className="text-red-500 fill-red-500" /> for educational institutions
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}