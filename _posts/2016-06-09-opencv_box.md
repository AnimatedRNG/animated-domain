---
title:  "OpenCV: Operations on Rectangular Neighborhoods"
author: Srinivas Kaza
categories: snippets
---

Earlier this week, I began implementing a zero-elimination median filter 
in C++ using OpenCV. The (well-optimized) median filter implementation in
OpenCV unfortunately does not have a flag/parameter to indicate that zeros
or invalid values should be excluded when computing the median.

Like many other OpenCV operations, a median filter operates upon a rectangular
neighborhood -- the filter takes the median of all pixels within a certain
rectangle in the image. I decided to write a method that would iteratively
apply a provided function to a neighborhood of pixels across the image, and
construct a new image from the outputs of the function. So you can think of
this mapping function as taking a neighborhood as parameters and returning a
pixel value $$F(Neighborhood) \rightarrow Pixel$$.

There are a variety of OpenCV {% ihighlight c++ %}cv::Mat{% endihighlight %}
types, and consequently the *type* of a given pixel will vary depending on the
type of image (i.e. single channel 8-bit grayscale, single channel 32-bit 
float, four 8-bit channel RGB, etc.). As a result, we will need a template
parameter to specify the type of the pixel.

To make things easier for ourselves, we define a type alias for a pointer to
the mapping function:

```cpp
template<typename T>
using box_function = T(*)(const std::vector<std::pair<cv::Point, T>>&,
                          const std::pair<cv::Point, T>&,
                          const cv::Rect&);
```

*This syntactic sugar was introduced in C++11. Pretty useful.*

Our mapping function takes a vector of {% ihighlight c++ %}(Point, Value)
{% endihighlight %} pairs, a {% ihighlight c++ %}(Point, Value)
{% endihighlight %} pair for the center position, and a {% ihighlight c++ %}
cv::Rect{% endihighlight %} describing the box neighborhood.

Now for our utility function itself:

```cpp
/**
 * @brief performs an operation on a rectangular neighborhood
 *
 * @param image                 input image
 * @param neighborhood_size     size of the rectangular neighborhood
 * @param func                  function to apply to each pixel
 * @param mask                  image mask (zero values are ignored)
 * @tparam T                    datatype of opencv matrix (float for 32-bit
 *                              float and rgb for 8UC3)
 * @return                      output image with the same size/type
 *                              as the input
 */
template<typename T>
inline static cv::Mat operate_neighborhood(cv::Mat image,
        const int& neighborhood_size,
        const box_function<T>& func,
        cv::Mat mask = cv::Mat()) {
    cv::Mat output = cv::Mat(image.size(), image.type());
    int rows = image.rows;
    int cols = image.cols;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (mask.data != NULL && mask.ptr<T>(r)[c] != 0)
                continue;
                
            int upper = std::max(r - neighborhood_size, 0);
            int lower = std::min(r + neighborhood_size + 1, rows);
            int left = std::max(c - neighborhood_size, 0);
            int right = std::min(c + neighborhood_size + 1, cols);
            int size = (lower - upper) * (right - left);
            cv::Rect box(cv::Point(left, upper), cv::Point(right, lower));
            std::vector<std::pair<cv::Point, T>> neighborhood;
            neighborhood.reserve(size);
            for (int nr = upper; nr < lower; nr++) {
                for (int nc = left; nc < right; nc++) {
                    cv::Point point(nc, nr);
                    T value = image.ptr<T>(nr)[nc];
                    neighborhood.push_back(std::make_pair(point, value));
                }
            }
            output.ptr<T>(r)[c] =
                func(neighborhood,
                     std::make_pair(cv::Point(r, c), image.ptr<T>(r)[c]), box);
        }
    }
    return output;
}
```

This little snippet isn't exactly optimized, but it works for most
non-realtime use cases. Reserving space in the vector for all the neighbors
considerably speeds up the operation. In my case, only part of the image is
actually filtered, so I added a check against an image mask.

You could possibly speed it up even more via OpenMP by parallelizing the first
for loop; just add a {% ihighlight c++ %}#pragma openmp parallel for
{% endihighlight %}. A word of warning though -- I don't know how thread safe
these image operations are. I haven't noticed any deleterious effects as a 
result of including the OpenMP directive, but there's clearly a reason OpenCV 
has its own {% ihighlight c++ %}parallel_for{% endihighlight %} operation.

Here is an example of a mapping function (a naive median filter implementation
with zero elimination):

```cpp
float median_filter(
    const std::vector<std::pair<cv::Point, float>>& neighbors,
    const std::pair<cv::Point, float>& center,
    const cv::Rect& box) {
    std::vector<float> sorted;
    for (auto a : neighbors)
        if (a.second >= zero_eps)
            sorted.push_back(a.second);
    std::sort(sorted.begin(), sorted.end());
    if (sorted.size() > 0)
        return sorted[sorted.size() / 2];
    else
        return 0;
}
```

We can implement more advanced filters as well, like a bilateral filter.

```cpp
float bilateral_filter(
    const std::vector<std::pair<cv::Point, float>>& neighborhood,
    const std::pair<cv::Point, float>& center,
    const cv::Rect& box) {
    float w_p = 0.0;
    float sum = 0.0;
    const cv::Point center_pos = center.first;
    const float center_value = center.second;
    for (auto a : neighborhood) {
        const cv::Point pos = a.first;
        const float value = a.second;
        
        if (value < zero_eps)
            continue;
            
        const cv::Point spatial_diff(pos.x - box.tl().x,
                                     pos.y - box.tl().y);
        const float spatial_term =
            spatial_kernel[spatial_diff.x][spatial_diff.y];
        const float range_term =
            normal_pdf(value - center_value, 0.0, _range_sigma);
        w_p += spatial_term * range_term;
        sum += value * spatial_term * range_term;
    }
    if (w_p == 0)
        return 0;
    else
        return sum / w_p;
}
```

This implementation uses a precomputed spatial kernel. It also ignores zeros.

We call {% ihighlight c++ %}operate_neighborhood
{% endihighlight %} on our mapping function to run the operation on our
image.  

```cpp
cv::Mat output_image = operate_neighborhood(input_image,
                                            median_kernel_s,
                                            &median_filter,
                                            mask);
```

If I made a mistake anywhere, feel free to point it out in the comments below!
Also, I'm switching to Isso comments soon, so goodbye Disqus.