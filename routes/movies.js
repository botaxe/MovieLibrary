const express = require('express')

const Movie = require('../models/movie')
const Director = require('../models/director')
const router = express.Router()
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif']


// All Movie Route
router.get('/', async (req, res) => {
    let query = Movie.find()
    if (req.query.title  != null && req.query.title != '') {
        query = query.regex('title', new RegExp(req.query.title, 'i'))
    }
    if (req.query.movieRating  != null && req.query.movieRating != '') {
        query = query.gte('movieRating', req.query.movieRating)
    }
    if (req.query.watchedBefore  != null && req.query.watchedBefore != '') {
        query = query.lte('watchDate', req.query.watchedBefore)
        // if query is less than/ equal to req.query.watchedBefore, then we want to return object
    }
    if (req.query.watchedAfter  != null && req.query.watchedAfter != '') {
        query = query.gte('watchDate', req.query.watchedAfter)
        // if query is less than/ equal to req.query.watchedBefore, then we want to return object
    }
    try {
        const movies =  await query.exec()
        res.render('movies/index', {
            movies: movies,
            searchOptions : req.query
        })
    } catch {
        res.redirect('/')
    }
})

// New Movie Route
router.get('/new', async (req, res) => {
    renderNewPage(res, new Movie())
})

// create Movie route
router.post('/', async (req, res) => {
    const movie = new Movie({
        title: req.body.title,
        director: req.body.director,
        watchDate: new Date(req.body.watchDate),
        //need to make a date because req.body.watchDate returns a string
        movieRating: req.body.movieRating,

        description: req.body.description
        //we arent actually storing in cover photo for this new movie so to do that we have to use npm i multer
    })
    saveCover(movie, req.body.cover)

    try {
        const newMovie = await movie.save()
        res.redirect('movies/${newMovie.id}')
    } catch {
        renderNewPage(res, movie, true)
    }
})

// Show Movie Route
router.get('/:id', async(req, res) => {
    try {
        const movie = await Movie.findById(req.params.id).populate('director').exec()
        res.render('movies/show', {movie: movie})
    } catch {
        res.redirect('/')
    }
})

// EDIT Movie Route
router.get('/:id/edit', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
        renderEditPage(res, movie)
    } catch {
        res.redirect('/')
    }
})
//Update movie Rout
router.put('/:id', async (req, res) => {
    let movie

    try {
        const movie = await Movie.findById(req.params.id)
        movie.title = req.body.title
        movie.director = req.body.director
        movie.watchDate = new Date(req.body.watchDate)
        movie.movieRating = req.body.movieRating
        movie.description = req.body.description
        if (req.body.cover != null && req.body.cover !== ''){
            saceCover(movie, req.body.cover)
        }
        await movie.save()
        res.redirect(`/movies/${movie.id}`)
    } catch {
        if (movie != null) {
            renderEditPage(res, movie, true)
        } else {
            redirect('/ ')
        }
    }
})
//Delete Movie Page
router.delete('/:id', async (req, res) => {
    let movie
    try {
        movie = await Movie.findById(req.params.id)
        await movie.remove()
        res.redirect('/movies')
    } catch {
        if (movie != null) {
            res.render('movies/show', {
                movie: movie,
                errorMessage : 'Could not remove movie'
            })
        } else { 
            res.redirect('/') 
        }
    }
})

async function renderNewPage(res, movie, hasError = false) {
    renderFormPage(res, movie, 'new', hasError)
}

async function renderEditPage(res, movie, hasError = false) {
    renderFormPage(res, movie, 'edit', hasError)
}

async function renderFormPage(res, movie, form, hasError = false) {
    try {
        const directors = await Director.find({})
        const params = {
            directors: directors,
            movie: movie
        }
        if (hasError) {
            if (form === 'edit') {
                params.errorMessage = 'Error Updating Movie'
            } else {
                params.errorMessage = 'Error Creating Movie'
            }
        }
        res.render(`movies/${form}`, params)
    } catch {
        res.redirect('/movies')
    }
}

function saveCover(movie, coverEncoded) {
    if (coverEncoded == null) return
    const cover = JSON.parse(coverEncoded)
    if (cover != null && imageMimeTypes.includes(cover.type )) {
        movie.coverImage = new Buffer.from(cover.data, 'base64')
        movie.coverImageType = cover.type
    }
}

module.exports = router