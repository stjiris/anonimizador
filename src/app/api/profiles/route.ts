import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { CONFIG_DIR } from '@/global';

const profilesFilePath = path.join(CONFIG_DIR, 'profiles.json');

function readProfiles() {
    if (!fs.existsSync(profilesFilePath)) return [];
    const raw = fs.readFileSync(profilesFilePath, 'utf-8');
    return JSON.parse(raw);
}

function writeProfiles(profiles: any[]) {
    fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
    return NextResponse.json(readProfiles());
}

export async function POST(req: NextRequest) {
    const newProfile = await req.json();
    const profiles = readProfiles();

    if (profiles.find((p: { name: any; }) => p.name === newProfile.name)) {
        return NextResponse.json({ error: 'Profile with that name already exists' }, { status: 400 });
    }

    profiles.push(newProfile);
    writeProfiles(profiles);

    return NextResponse.json(newProfile, { status: 201 });
}
