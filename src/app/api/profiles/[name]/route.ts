import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { CONFIG_DIR } from '@/global';

const profilesFilePath = path.join(CONFIG_DIR, 'file-profiles-config.json');

function readProfiles() {
    if (!fs.existsSync(profilesFilePath)) return [];
    const raw = fs.readFileSync(profilesFilePath, 'utf-8');
    return JSON.parse(raw);
}

function writeProfiles(profiles: any[]) {
    fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2), 'utf-8');
}

export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }) {
    const { name } = await context.params; // <-- await here
    const profiles = readProfiles();
    const profile = profiles.find((p: { name: string }) => p.name === name);

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(profile);
}


export async function PUT(req: NextRequest, context: { params: Promise<{ name: string }> }) {
    const { name } = await context.params;
    const updates = await req.json();
    const profiles = readProfiles();
    const index = profiles.findIndex((p: { name: string }) => p.name === name);

    if (index === -1) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    profiles[index] = { ...profiles[index], ...updates };
    writeProfiles(profiles);

    return NextResponse.json(profiles[index]);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ name: string }> }) {
    const { name } = await context.params;
    const profiles = readProfiles();
    const index = profiles.findIndex((p: { name: string }) => p.name === name);

    if (index === -1) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const [removed] = profiles.splice(index, 1);
    writeProfiles(profiles);

    return NextResponse.json(removed);
}
