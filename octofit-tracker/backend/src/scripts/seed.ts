import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Activity, Team, User, Workout } from '../models/index.js';

// Seed stable demo records without clearing data owned by the application.
async function upsertDemoTeam(seedKey: string, name: string, mascot: string) {
  const previousTeam = await Team.findOne({ seedKey }) ?? await Team.findOne({ name });
  return Team.findOneAndUpdate(
    previousTeam ? { _id: previousTeam._id } : { seedKey },
    { $set: { seedKey, name, mascot } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

async function upsertDemoUser(
  seedKey: string,
  name: string,
  email: string,
  teamId: InstanceType<typeof Team>['_id'],
  fitnessGoal: string,
) {
  const previousUser = (await User.findOne({ seedKey }).select('_id team'))
    ?? (await User.findOne({ email }).select('_id team'));
  if (previousUser?.team && previousUser.team.toString() !== teamId.toString()) {
    await Team.updateOne({ _id: previousUser.team }, { $pull: { members: previousUser._id } });
  }
  const user = await User.findOneAndUpdate(
    previousUser ? { _id: previousUser._id } : { seedKey },
    { $set: { seedKey, name, email, team: teamId, fitnessGoal } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  await Team.updateOne({ _id: teamId }, { $addToSet: { members: user._id } });
  return user;
}

async function upsertDemoActivity(
  seedKey: string,
  userId: InstanceType<typeof User>['_id'],
  teamId: InstanceType<typeof Team>['_id'],
  type: string,
  minutes: number,
  occurredAt: Date,
) {
  const legacyKey = { user: userId, team: teamId, type, occurredAt };
  const previousActivity = await Activity.findOne({ seedKey }) ?? await Activity.findOne(legacyKey);
  return Activity.findOneAndUpdate(
    previousActivity ? { _id: previousActivity._id } : { seedKey },
    { $set: { seedKey, user: userId, team: teamId, type, minutes, points: minutes, occurredAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

async function upsertDemoWorkout(seedKey: string, title: string, focus: string) {
  const previousWorkout = await Workout.findOne({ seedKey }) ?? await Workout.findOne({ title });
  return Workout.findOneAndUpdate(
    previousWorkout ? { _id: previousWorkout._id } : { seedKey },
    { $set: { seedKey, title, focus, minutes: 30, difficulty: 'moderate' } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
}

export async function seed() {
  await connectDatabase();
  try {
    const octocats = await upsertDemoTeam('team-octocats', 'Octocats', 'Mona');
    const robocats = await upsertDemoTeam('team-robocats', 'Robocats', 'Hubot');
    const mona = await upsertDemoUser('user-mona', 'Mona', 'mona@example.com', octocats._id, 'endurance');
    const hubot = await upsertDemoUser('user-hubot', 'Hubot', 'hubot@example.com', robocats._id, 'strength');

    const monaRunAt = new Date('2026-01-10T12:00:00.000Z');
    const hubotCycleAt = new Date('2026-01-11T12:00:00.000Z');
    await upsertDemoActivity('activity-mona-run', mona._id, octocats._id, 'run', 40, monaRunAt);
    await upsertDemoActivity('activity-hubot-cycle', hubot._id, robocats._id, 'cycle', 25, hubotCycleAt);
    await upsertDemoWorkout('workout-intervals', 'Intervals', 'endurance');
    await upsertDemoWorkout('workout-strength-circuit', 'Strength Circuit', 'strength');
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed();
}
