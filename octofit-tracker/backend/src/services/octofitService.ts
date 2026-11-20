import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serviceInputError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw serviceInputError('Activity input must be an object');
  }

  const { userId, teamId, type, minutes } = input;
  const validId = (value: unknown) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

  if (!validId(userId) || !validId(teamId)) {
    throw serviceInputError('userId and teamId must be valid IDs');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw serviceInputError('type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw serviceInputError('minutes must be a positive number');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id').lean(),
    Team.findById(teamId).select('_id').lean(),
  ]);
  if (!user || !team) {
    throw serviceInputError('userId and teamId must reference existing records', 404);
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw serviceInputError('Team input must be an object');
  }

  const { name, mascot, members = [] } = input;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw serviceInputError('name is required');
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw serviceInputError('mascot is required');
  }
  if (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && /^[a-f\d]{24}$/i.test(member))) {
    throw serviceInputError('members must be an array of valid user IDs');
  }

  const existingMembers = members.length
    ? await User.find({ _id: { $in: members } }).select('_id').lean()
    : [];
  const existingMemberIds = new Set(existingMembers.map((member) => member._id.toString()));
  if (members.some((member) => !existingMemberIds.has(member.toLowerCase()))) {
    throw serviceInputError('members must reference existing users', 404);
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members,
  });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map(({ _id, name }) => ({
      teamName: name,
      totalPoints: pointsByTeam.get(_id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) {
    throw serviceInputError('User not found', 404);
  }

  const workouts = await Workout.find().lean();
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const goalWorkout = workouts.find((workout) => workout.focus.toLowerCase() === goalFocus);
  if (goalWorkout) {
    return [{ ...goalWorkout, reason: `Recommended because ${user.fitnessGoal} is your fitness goal.` }];
  }

  const [recentActivity] = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean();
  if (!recentActivity) {
    return [];
  }

  const activityType = recentActivity.type.trim().toLowerCase();
  const activityFocus = ['run', 'running', 'cycle', 'cycling', 'cardio'].includes(activityType)
    ? 'endurance'
    : activityType;
  const activityWorkout = workouts.find((workout) => workout.focus.toLowerCase() === activityFocus);
  if (!activityWorkout) {
    return [];
  }

  return [{ ...activityWorkout, reason: `Recommended based on your recent ${recentActivity.type} activity.` }];
}

export { User };
