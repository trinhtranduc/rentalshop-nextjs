//
//  ImageViewerViewController.swift
//  POS ADBD
//
//  Full-screen photo viewer (#472): the note image preview (black, X button) with paging between photos,
//  pinch / double-tap zoom and swipe down to close. Used by product detail v2 and the Home v2 rows.
//

import UIKit
import Kingfisher

final class ImageViewerViewController: UIViewController {
    private let urls: [String]
    private var index: Int
    private let pager = UIScrollView()
    private var pages: [ZoomingImagePage] = []
    private let closeButton = UIButton(type: .system)
    private let counter = UILabel()
    private let dismissPan = UIPanGestureRecognizer()
    private var lastLayoutWidth: CGFloat = 0

    init(urls: [String], startIndex: Int = 0) {
        self.urls = urls
        self.index = urls.isEmpty ? 0 : min(max(startIndex, 0), urls.count - 1)
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .overFullScreen
        modalTransitionStyle = .crossDissolve
        modalPresentationCapturesStatusBarAppearance = true
    }

    convenience init(request: ProductImageViewerRequest) {
        self.init(urls: request.urls, startIndex: request.startIndex)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        pager.isPagingEnabled = true
        pager.showsHorizontalScrollIndicator = false
        pager.showsVerticalScrollIndicator = false
        pager.isDirectionalLockEnabled = true
        pager.alwaysBounceVertical = false
        pager.contentInsetAdjustmentBehavior = .never
        pager.delegate = self
        view.addSubview(pager)

        for url in urls {
            let page = ZoomingImagePage()
            page.load(url)
            pager.addSubview(page)
            pages.append(page)
        }

        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        closeButton.layer.cornerRadius = 22
        closeButton.accessibilityLabel = "Close".localized()
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeButton)

        counter.font = Utils.boldFont(size: DS.TextSize.pill)
        counter.textColor = .white
        counter.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        counter.layer.cornerRadius = 11
        counter.clipsToBounds = true
        counter.textAlignment = .center
        counter.isHidden = urls.count < 2
        counter.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(counter)

        NSLayoutConstraint.activate([
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44),
            counter.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            counter.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            counter.heightAnchor.constraint(equalToConstant: 22),
            counter.widthAnchor.constraint(greaterThanOrEqualToConstant: 48)
        ])

        dismissPan.addTarget(self, action: #selector(handleDismissPan(_:)))
        dismissPan.delegate = self
        view.addGestureRecognizer(dismissPan)
        updateCounter()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let size = view.bounds.size
        guard size.width > 0 else { return }
        pager.frame = view.bounds
        for (i, page) in pages.enumerated() {
            page.frame = CGRect(x: CGFloat(i) * size.width, y: 0, width: size.width, height: size.height)
        }
        pager.contentSize = CGSize(width: size.width * CGFloat(pages.count), height: size.height)
        if lastLayoutWidth != size.width {
            lastLayoutWidth = size.width
            pager.contentOffset = CGPoint(x: CGFloat(index) * size.width, y: 0)
        }
    }

    private func updateCounter() {
        counter.text = " \(index + 1)/\(urls.count) "
        counter.accessibilityLabel = "\(index + 1)/\(urls.count)"
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func handleDismissPan(_ gesture: UIPanGestureRecognizer) {
        let dy = max(0, gesture.translation(in: view).y)
        switch gesture.state {
        case .changed:
            pager.transform = CGAffineTransform(translationX: 0, y: dy)
            view.backgroundColor = UIColor.black.withAlphaComponent(max(0.3, 1 - dy / 400))
        case .ended, .cancelled:
            if gesture.state == .ended, dy > 120 || gesture.velocity(in: view).y > 900 {
                dismiss(animated: true)
            } else {
                UIView.animate(withDuration: 0.25) {
                    self.pager.transform = .identity
                    self.view.backgroundColor = .black
                }
            }
        default:
            break
        }
    }
}

extension ImageViewerViewController: UIScrollViewDelegate {
    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        guard scrollView === pager, scrollView.bounds.width > 0 else { return }
        let page = min(max(Int(round(scrollView.contentOffset.x / scrollView.bounds.width)), 0), max(pages.count - 1, 0))
        guard page != index else { return }
        // Zoom resets when the page changes
        pages.indices.filter { $0 != page }.forEach { pages[$0].resetZoom() }
        index = page
        updateCounter()
    }
}

extension ImageViewerViewController: UIGestureRecognizerDelegate {
    /// Swipe down closes only from an unzoomed photo, and only when the drag is mostly downward
    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard gestureRecognizer === dismissPan else { return true }
        if pages.indices.contains(index), pages[index].isZoomed { return false }
        let velocity = dismissPan.velocity(in: view)
        return velocity.y > 0 && velocity.y > abs(velocity.x)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        gestureRecognizer === dismissPan
    }
}

/// One photo that zooms (1x–4x) with pinch or a double tap
private final class ZoomingImagePage: UIScrollView, UIScrollViewDelegate {
    private let imageView = UIImageView()

    var isZoomed: Bool { zoomScale > minimumZoomScale + 0.01 }

    override init(frame: CGRect) {
        super.init(frame: frame)
        minimumZoomScale = 1
        maximumZoomScale = 4
        showsHorizontalScrollIndicator = false
        showsVerticalScrollIndicator = false
        alwaysBounceVertical = false
        contentInsetAdjustmentBehavior = .never
        delegate = self
        imageView.contentMode = .scaleAspectFit
        imageView.isAccessibilityElement = true
        imageView.accessibilityTraits = UIAccessibilityTraitImage
        addSubview(imageView)
        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(doubleTapped(_:)))
        doubleTap.numberOfTapsRequired = 2
        addGestureRecognizer(doubleTap)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        if !isZoomed {
            imageView.frame = CGRect(origin: .zero, size: bounds.size)
            contentSize = bounds.size
        }
    }

    func load(_ url: String) {
        guard let link = URL(string: url) else { return }
        imageView.kf.indicatorType = .activity
        imageView.kf.setImage(with: link, options: [.transition(.fade(0.1))])
    }

    func resetZoom() {
        setZoomScale(minimumZoomScale, animated: false)
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

    @objc private func doubleTapped(_ gesture: UITapGestureRecognizer) {
        if isZoomed {
            setZoomScale(minimumZoomScale, animated: true)
        } else {
            let point = gesture.location(in: imageView)
            let scale: CGFloat = 2.5
            let size = CGSize(width: bounds.width / scale, height: bounds.height / scale)
            zoom(to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2, width: size.width, height: size.height), animated: true)
        }
    }
}
