module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: false,
      message: 'Authentication required'
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: false,
      message: 'Admin access only'
    })
  }

  next()
}
