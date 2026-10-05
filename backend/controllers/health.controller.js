function getHealth(_request, response) {
  response.status(200).json({
    success: true,
    data: { status: 'ok' },
  });
}

module.exports = { getHealth };
