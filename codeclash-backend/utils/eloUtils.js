/**
 * Calculates the new Elo ratings for two players after a match.
 * 
 * @param {number} ratingA - Current Elo rating of Player A.
 * @param {number} ratingB - Current Elo rating of Player B.
 * @param {number} scoreA - Score of Player A (1 for win, 0.5 for draw, 0 for loss).
 * @param {number} kFactor - The K-factor determined by the importance of the match (default 32).
 * @returns {object} - An object containing the new ratings for both players.
 */
function calculateNewRatings(ratingA, ratingB, scoreA, kFactor = 32) {
    const scoreB = 1 - scoreA;

    // Expected probability of winning
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

    // New ratings
    const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA));
    const newRatingB = Math.round(ratingB + kFactor * (scoreB - expectedB));

    return {
        newRatingA,
        newRatingB,
        changeA: newRatingA - ratingA,
        changeB: newRatingB - ratingB
    };
}

module.exports = {
    calculateNewRatings
};
