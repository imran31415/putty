export function getCloseMessage(accuracy: number): string {
  if (accuracy >= 95) {
    return '🔥 Lipped out!';
  } else if (accuracy >= 85) {
    return '😮 So close!';
  } else if (accuracy >= 70) {
    return '👍 Nice try!';
  } else if (accuracy >= 50) {
    return '📏 Getting closer';
  } else if (accuracy >= 30) {
    return '💪 Keep practicing';
  } else {
    return '🎯 Way off!';
  }
}
