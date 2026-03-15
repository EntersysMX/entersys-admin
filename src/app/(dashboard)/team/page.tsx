'use client';

import { useEffect, useState } from 'react';
import { UserCheck, Mail, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  PLATFORM_ADMIN: 'Admin Plataforma',
  DIRECTOR: 'Director',
  SALES_MANAGER: 'Gerente Ventas',
  SALES_SUPERVISOR: 'Supervisor Ventas',
  SALES_AGENT: 'Agente Ventas',
  GERENTE_SOPORTE: 'Gerente Soporte',
  SOPORTE_TECNICO: 'Soporte Tecnico',
  COMPRAS: 'Compras',
  RRHH: 'Recursos Humanos',
  CHOFER: 'Chofer',
  CONTENT_ADMIN: 'Admin Contenido',
  CONTENT_EDITOR: 'Editor Contenido',
  MEMBER: 'Miembro',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const data = await apiClient.get<TeamMember[]>('/v1/users');
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UserCheck className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Equipo</h1>
        </div>
        <p className="text-gray-600">
          Directorio del equipo y gestion de personal
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rol</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ultimo Acceso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                      {member.firstName?.[0] || ''}{member.lastName?.[0] || ''}
                    </div>
                    <span className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {member.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    <Shield className="w-3 h-3" />
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {member.lastLoginAt
                    ? new Date(member.lastLoginAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Nunca'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        {members.length} miembro{members.length !== 1 ? 's' : ''} en el equipo
      </p>
    </div>
  );
}
